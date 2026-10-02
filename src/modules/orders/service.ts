import { db } from '@/lib/db';
import { OrderSnapshot, OrderItemSnapshot, ShippingAddress } from '@/lib/types';
import { inventoryService } from '@/modules/inventory';
import { couponService } from '@/modules/coupons';
import { paymentService, PaymentProviderType } from '@/modules/payments';
import { shippingService } from '@/modules/shipping';
import { auditService } from '@/modules/audit';
import { jobService } from '@/modules/jobs';
import { generateOrderNumber, generateInvoiceNumber } from '@/lib/counters';
import { AppError } from '@/lib/errors';
import { clientEnv } from '@/config/env.client';

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: ShippingAddress;
  deliveryMethod: 'standard' | 'express_60';
  paymentPreference: 'upi_whatsapp' | 'razorpay' | 'cod';
  items: OrderItemSnapshot[];
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  couponCode?: string;
  notes?: string;
}

export const orderService = {
  /**
   * Creates an order with atomic stock hold reservation, coupon lock, and payment intent.
   */
  async createOrder(input: CreateOrderInput): Promise<OrderSnapshot> {
    if (!input.items || input.items.length === 0) {
      throw new AppError('EMPTY_CART', 'Cannot create order with an empty basket.');
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const orderNo = await generateOrderNumber();

    // 1. Reserve stock hold atomically
    await inventoryService.reserveStock(
      orderId,
      input.items.map((i) => ({ variantId: i.variantId, sku: i.sku, quantity: i.quantity }))
    );

    // 2. Lock coupon if provided
    if (input.couponCode && input.discountPaise > 0) {
      try {
        await couponService.redeemCoupon(
          input.couponCode,
          orderId,
          input.discountPaise,
          input.customerPhone
        );
      } catch (couponErr) {
        // Rollback stock reservation if coupon fails
        await inventoryService.releaseReservation(
          orderId,
          input.items.map((i) => ({ variantId: i.variantId, sku: i.sku, quantity: i.quantity }))
        );
        throw couponErr;
      }
    }

    // 3. Create payment intent via provider abstraction
    const paymentProviderType: PaymentProviderType =
      input.paymentPreference === 'razorpay' ? 'razorpay' : 'whatsapp_upi';

    const paymentIntent = await paymentService.createIntent(
      {
        orderId,
        orderNo,
        amountPaise: input.totalPaise,
        customer: {
          name: input.customerName,
          phone: input.customerPhone,
          email: input.customerEmail,
        },
      },
      paymentProviderType
    );

    const initialTimeline = [
      {
        id: `ev_${Date.now()}_created`,
        status: 'placed',
        description: `Order placed via ${input.paymentPreference.toUpperCase()}. 15-minute stock hold reserved.`,
        actor: 'Customer',
        createdAt: new Date().toISOString(),
      },
    ];

    const order: OrderSnapshot = {
      id: orderId,
      orderNo,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      shippingAddress: input.shippingAddress,
      deliveryMethod: input.deliveryMethod,
      paymentPreference: input.paymentPreference,
      paymentStatus: input.paymentPreference === 'cod' ? 'authorized' : 'pending_whatsapp',
      fulfilmentStatus: 'unfulfilled',
      orderStatus: 'open',
      items: input.items,
      subtotalPaise: input.subtotalPaise,
      discountPaise: input.discountPaise,
      deliveryFeePaise: input.deliveryFeePaise,
      totalPaise: input.totalPaise,
      couponCode: input.couponCode,
      timeline: initialTimeline,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 4. Save to persistent DB
    const saved = await db.saveOrder(order);

    // 5. Enqueue background hold-expiration job (15 minutes from now)
    const holdExpiryMinutes = clientEnv.holdExpiryMinutes || 15;
    await jobService.enqueueJob(
      'expire_reservation',
      { orderId: saved.id, orderNo: saved.orderNo },
      {
        runAt: new Date(Date.now() + holdExpiryMinutes * 60 * 1000),
        dedupeKey: `hold_exp_${saved.id}`,
      }
    );

    // 6. Record audit log
    await auditService.recordAudit({
      action: 'ORDER_CREATE',
      entity: 'order',
      entityId: saved.id,
      actor: input.customerName,
      after: {
        orderNo: saved.orderNo,
        totalPaise: saved.totalPaise,
        itemsCount: saved.items.length,
      },
    });

    return saved;
  },

  /**
   * Updates fulfillment status with state machine rules and stock transitions.
   */
  async updateFulfillmentStatus(
    orderId: string,
    nextStatus: string,
    actor = 'Warehouse Dispatcher'
  ): Promise<OrderSnapshot> {
    const order = await db.getOrderById(orderId);
    if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found');

    const previousStatus = order.fulfilmentStatus;

    // Handle stock commits when order progresses into allocation or packing
    if (['allocated', 'picking', 'packed'].includes(nextStatus) && previousStatus === 'unfulfilled') {
      await inventoryService.commitReservation(
        order.id,
        order.items.map((i) => ({ variantId: i.variantId, sku: i.sku, quantity: i.quantity }))
      );
    }

    // Auto-generate invoice if payment is confirmed or packing
    if (!order.invoiceNo && (order.paymentStatus === 'paid' || nextStatus === 'packed')) {
      order.invoiceNo = await generateInvoiceNumber('26-27');
    }

    // Dispatching out for delivery generates shipment
    if (nextStatus === 'out_for_delivery' && !order.trackingNumber) {
      const shipment = await shippingService.createShipment({
        orderId: order.id,
        orderNo: order.orderNo,
        deliveryMethod: order.deliveryMethod,
        destinationPincode: order.shippingAddress.pincode,
        destinationAddress: order.shippingAddress,
        customer: {
          name: order.customerName,
          phone: order.customerPhone,
        },
      });
      order.trackingNumber = shipment.trackingNumber;
    }

    // Handling cancellation
    if (nextStatus === 'cancelled') {
      if (previousStatus === 'unfulfilled') {
        await inventoryService.releaseReservation(
          order.id,
          order.items.map((i) => ({ variantId: i.variantId, sku: i.sku, quantity: i.quantity }))
        );
      }
      if (order.couponCode) {
        await couponService.releaseCoupon(order.couponCode, order.id);
      }
      order.orderStatus = 'cancelled';
    }

    if (nextStatus === 'delivered') {
      order.orderStatus = 'completed';
    }

    order.fulfilmentStatus = nextStatus as any;
    order.timeline.push({
      id: `ev_${Date.now()}`,
      status: nextStatus,
      description: `Fulfillment status advanced to ${nextStatus.toUpperCase()}`,
      actor,
      createdAt: new Date().toISOString(),
    });
    order.updatedAt = new Date().toISOString();

    const saved = await db.saveOrder(order);

    await auditService.recordAudit({
      action: 'ORDER_FULFILLMENT_UPDATE',
      entity: 'order',
      entityId: order.id,
      actor,
      before: { fulfilmentStatus: previousStatus },
      after: { fulfilmentStatus: nextStatus, invoiceNo: order.invoiceNo },
    });

    return saved;
  },

  /**
   * Confirms payment and generates statutory invoice.
   */
  async updatePaymentStatus(
    orderId: string,
    nextPaymentStatus: string,
    actor = 'Finance Admin'
  ): Promise<OrderSnapshot> {
    const order = await db.getOrderById(orderId);
    if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found');

    const previousStatus = order.paymentStatus;
    order.paymentStatus = nextPaymentStatus as any;

    if (nextPaymentStatus === 'paid') {
      if (!order.invoiceNo) {
        order.invoiceNo = await generateInvoiceNumber('26-27');
      }
      // Commit reserved stock
      await inventoryService.commitReservation(
        order.id,
        order.items.map((i) => ({ variantId: i.variantId, sku: i.sku, quantity: i.quantity }))
      );
    }

    order.timeline.push({
      id: `ev_${Date.now()}`,
      status: nextPaymentStatus,
      description: `Payment marked ${nextPaymentStatus.toUpperCase()}${order.invoiceNo ? ` (Invoice ${order.invoiceNo})` : ''}`,
      actor,
      createdAt: new Date().toISOString(),
    });
    order.updatedAt = new Date().toISOString();

    const saved = await db.saveOrder(order);

    await auditService.recordAudit({
      action: 'ORDER_PAYMENT_UPDATE',
      entity: 'order',
      entityId: order.id,
      actor,
      before: { paymentStatus: previousStatus },
      after: { paymentStatus: nextPaymentStatus, invoiceNo: order.invoiceNo },
    });

    return saved;
  },

  async getOrders(): Promise<OrderSnapshot[]> {
    return db.getOrders();
  },

  async getOrderById(id: string): Promise<OrderSnapshot | undefined> {
    return db.getOrderById(id);
  },
};
