import { db, OrderQueryOptions } from '@/lib/db';
import { OrderSnapshot, OrderItemSnapshot, ShippingAddress, FulfilmentStatus, PaymentStatus, OrderStatus } from '@/lib/types';
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
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: ShippingAddress;
  deliveryMethod: 'standard' | 'express_60';
  paymentPreference: 'upi_whatsapp' | 'cod_whatsapp' | 'online_gateway' | 'razorpay' | 'cod';
  items: OrderItemSnapshot[];
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  couponCode?: string;
  notes?: string;
}

export interface ManualOrderUpdateInput {
  fulfilmentStatus?: FulfilmentStatus;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  trackingNumber?: string;
  assignedRider?: {
    name: string;
    phone: string;
    vehicleNo: string;
    etaMinutes?: number;
  };
  adminNote?: string;
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

    const isWhatsAppBooking =
      input.paymentPreference === 'upi_whatsapp' || input.paymentPreference === 'cod_whatsapp';

    const initialTimeline = [
      {
        id: `ev_${Date.now()}_created`,
        status: isWhatsAppBooking ? 'pending_whatsapp' : 'placed',
        description: isWhatsAppBooking
          ? 'WhatsApp checkout request initiated by customer. Awaiting payment verification & admin confirmation. Stock hold reserved.'
          : `Order placed via ${input.paymentPreference.toUpperCase()}. 15-minute stock hold reserved.`,
        actor: 'Customer',
        createdAt: new Date().toISOString(),
      },
    ];

    const order: OrderSnapshot = {
      id: orderId,
      orderNo,
      customerId: input.customerId,
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
    try {
      const holdExpiryMinutes = clientEnv.holdExpiryMinutes || 15;
      await jobService.enqueueJob(
        'expire_reservation',
        { orderId: saved.id, orderNo: saved.orderNo },
        {
          runAt: new Date(Date.now() + holdExpiryMinutes * 60 * 1000),
          dedupeKey: `hold_exp_${saved.id}`,
        }
      );
    } catch (jobErr) {
      console.warn('Non-fatal: Failed to enqueue expiration job:', jobErr);
    }

    // 6. Record audit log
    try {
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
    } catch (auditErr) {
      console.warn('Non-fatal: Failed to record audit log:', auditErr);
    }

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

  /**
   * Comprehensive manual update of order status, tracking, and timeline notes by administrator.
   */
  async manualUpdateOrder(
    orderId: string,
    updates: ManualOrderUpdateInput,
    actor = 'Operations Admin'
  ): Promise<OrderSnapshot> {
    const order = await db.getOrderById(orderId);
    if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found');

    const beforeState = {
      fulfilmentStatus: order.fulfilmentStatus,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      trackingNumber: order.trackingNumber,
    };

    const previousFulfilment = order.fulfilmentStatus;
    const previousPayment = order.paymentStatus;
    const items = order.items.map((i) => ({ variantId: i.variantId, sku: i.sku, quantity: i.quantity }));

    // 1. Fulfilment status change
    if (updates.fulfilmentStatus && updates.fulfilmentStatus !== previousFulfilment) {
      const nextFulfilment = updates.fulfilmentStatus;

      // Commit stock if transitioning from unfulfilled to allocated / picking / packed / shipped / delivered
      if (
        ['allocated', 'picking', 'packed', 'shipped', 'out_for_delivery', 'delivered'].includes(nextFulfilment) &&
        previousFulfilment === 'unfulfilled'
      ) {
        await inventoryService.commitReservation(order.id, items);
      }

      // Cancellation logic
      if (nextFulfilment === 'cancelled') {
        if (previousFulfilment === 'unfulfilled') {
          await inventoryService.releaseReservation(order.id, items);
        }
        if (order.couponCode) {
          await couponService.releaseCoupon(order.couponCode, order.id);
        }
        order.orderStatus = 'cancelled';
      } else if (nextFulfilment === 'delivered') {
        order.orderStatus = 'completed';
      }

      order.fulfilmentStatus = nextFulfilment;

      order.timeline.push({
        id: `ev_${Date.now()}_fulfil`,
        status: nextFulfilment,
        description: `Fulfillment status manually updated to ${nextFulfilment.toUpperCase()}`,
        actor,
        createdAt: new Date().toISOString(),
      });
    }

    // 2. Payment status change
    if (updates.paymentStatus && updates.paymentStatus !== previousPayment) {
      const nextPayment = updates.paymentStatus;
      order.paymentStatus = nextPayment;

      if (nextPayment === 'paid') {
        if (!order.invoiceNo) {
          order.invoiceNo = await generateInvoiceNumber('26-27');
        }
        // Commit stock if still unfulfilled
        if (order.fulfilmentStatus === 'unfulfilled') {
          await inventoryService.commitReservation(order.id, items);
          order.fulfilmentStatus = 'allocated';
        }
      }

      order.timeline.push({
        id: `ev_${Date.now()}_pay`,
        status: nextPayment,
        description: `Payment status manually updated to ${nextPayment.toUpperCase()}${order.invoiceNo ? ` (Invoice ${order.invoiceNo})` : ''}`,
        actor,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Order status change (open, processing, completed, cancelled)
    if (updates.orderStatus && updates.orderStatus !== order.orderStatus) {
      const nextOrderStatus = updates.orderStatus;
      order.orderStatus = nextOrderStatus;
      if (nextOrderStatus === 'cancelled' && order.fulfilmentStatus !== 'cancelled') {
        if (order.fulfilmentStatus === 'unfulfilled') {
          await inventoryService.releaseReservation(order.id, items);
        }
        if (order.couponCode) {
          await couponService.releaseCoupon(order.couponCode, order.id);
        }
        order.fulfilmentStatus = 'cancelled';
      }
      order.timeline.push({
        id: `ev_${Date.now()}_ordstat`,
        status: nextOrderStatus,
        description: `Order status updated to ${nextOrderStatus.toUpperCase()}`,
        actor,
        createdAt: new Date().toISOString(),
      });
    }

    // 4. Tracking number update
    if (updates.trackingNumber !== undefined && updates.trackingNumber !== order.trackingNumber) {
      order.trackingNumber = updates.trackingNumber.trim() || undefined;
      if (order.trackingNumber) {
        order.timeline.push({
          id: `ev_${Date.now()}_track`,
          status: 'tracking_updated',
          description: `Tracking number assigned: ${order.trackingNumber}`,
          actor,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 5. Assigned rider update
    if (updates.assignedRider) {
      order.assignedRider = {
        name: updates.assignedRider.name,
        phone: updates.assignedRider.phone,
        vehicleNo: updates.assignedRider.vehicleNo,
        etaMinutes: updates.assignedRider.etaMinutes || 30,
      };
      order.timeline.push({
        id: `ev_${Date.now()}_rider`,
        status: 'rider_assigned',
        description: `Express rider assigned: ${order.assignedRider.name} (${order.assignedRider.phone})`,
        actor,
        createdAt: new Date().toISOString(),
      });
    }

    // 6. Custom admin note
    if (updates.adminNote && updates.adminNote.trim()) {
      order.timeline.push({
        id: `ev_${Date.now()}_note`,
        status: 'admin_note',
        description: updates.adminNote.trim(),
        actor,
        createdAt: new Date().toISOString(),
      });
    }

    // Auto-generate invoice if paid or packing/shipped and missing
    if (!order.invoiceNo && (order.paymentStatus === 'paid' || ['packed', 'shipped', 'delivered'].includes(order.fulfilmentStatus))) {
      order.invoiceNo = await generateInvoiceNumber('26-27');
    }

    order.updatedAt = new Date().toISOString();
    const saved = await db.saveOrder(order);

    await auditService.recordAudit({
      action: 'ORDER_MANUAL_UPDATE',
      entity: 'order',
      entityId: order.id,
      actor,
      before: beforeState,
      after: {
        fulfilmentStatus: saved.fulfilmentStatus,
        paymentStatus: saved.paymentStatus,
        orderStatus: saved.orderStatus,
        trackingNumber: saved.trackingNumber,
      },
    });

    return saved;
  },

  async getOrders(options?: OrderQueryOptions): Promise<OrderSnapshot[]> {
    return db.getOrders(options);
  },

  async getOrderById(id: string): Promise<OrderSnapshot | undefined> {
    return db.getOrderById(id);
  },
};
