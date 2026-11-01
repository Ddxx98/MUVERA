import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, connectToMongo } from '@/lib/db';
import { orderService } from '@/modules/orders';
import { requireAdmin, getOptionalUser } from '@/modules/auth/guards';
import { IdempotencyKeyModel } from '@/lib/models/IdempotencyKey';
import { SiteSettingsModel } from '@/lib/models/SiteSettings';
import { serverEnv } from '@/config/env.server';
import { AppError } from '@/lib/errors';

export async function GET(req: Request) {
  try {
    await connectToMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    // If requesting a single order by ID, require customer (owns it) or admin
    if (id) {
      const ctx = await getOptionalUser();
      const order = await orderService.getOrderById(id);
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

      // Enforce ownership: customers can only access their own orders
      if (ctx && ctx.role !== 'admin') {
        const idMatch = ctx.id && order.customerId && ctx.id === order.customerId;
        const ownerEmail = order.customerEmail || '';
        const ownerPhone = (order.customerPhone || '').replace(/\D/g, '').slice(-10);
        const userPhone = (ctx.phone || '').replace(/\D/g, '').slice(-10);
        const emailMatch = ownerEmail && ctx.email.toLowerCase() === ownerEmail.toLowerCase();
        const phoneMatch = ownerPhone && userPhone && userPhone === ownerPhone;
        if (!idMatch && !emailMatch && !phoneMatch) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      // Customer-safe response
      const safeOrder = {
        ...order,
        // Strip sensitive internal fields if requested by non-admin customer
        ...(ctx?.role !== 'admin'
          ? {
              assignedRider: order.assignedRider,
            }
          : {}),
      };

      return NextResponse.json({ order: safeOrder });
    }

    // Listing orders:
    const ctx = await getOptionalUser();
    if (!ctx) {
      return NextResponse.json({ error: 'Authentication required to view orders' }, { status: 401 });
    }

    // Admins see all store orders, or filter by userId
    if (ctx.role === 'admin') {
      const orders = await orderService.getOrders(userId ? { customerId: userId } : undefined);
      return NextResponse.json({ orders });
    }

    // Authenticated customers see only their own orders
    const userPhone = (ctx.phone || '').replace(/\D/g, '').slice(-10);
    const userEmail = (ctx.email || '').toLowerCase().trim();

    const orders = await orderService.getOrders({
      customerId: ctx.id,
      customerEmail: userEmail,
      customerPhone: userPhone,
      limit: 50,
    });

    return NextResponse.json({ orders });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Failed to fetch orders' }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await connectToMongo();
    const ctx = await getOptionalUser();
    if (!ctx || !ctx.id) {
      return NextResponse.json(
        { error: 'Please sign in or create an account to place an order.' },
        { status: 401 }
      );
    }
    const body = await req.json();

    // Check runtime feature flag from SiteSettings
    const settings = await SiteSettingsModel.findOne().lean().catch(() => null);
    const isV2Enabled = settings?.checkoutV2Enabled ?? false;

    const idempotencyKey = req.headers.get('Idempotency-Key')?.trim();
    const customerId = ctx?.id || (body.customerPhone ? `phone_${body.customerPhone.replace(/\D/g, '').slice(-10)}` : 'guest');
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

    let idempotencyDoc: any = null;

    // Idempotency lease lock if key is provided
    if (idempotencyKey) {
      try {
        idempotencyDoc = await IdempotencyKeyModel.create({
          key: idempotencyKey,
          customerId,
          requestHash,
          status: 'in_progress',
          leaseExpiresAt: new Date(Date.now() + 60 * 1000), // 60-second lease
        });
      } catch (err: any) {
        if (err.code === 11000) {
          const existing = await IdempotencyKeyModel.findOne({ customerId, key: idempotencyKey });
          if (!existing) {
            return NextResponse.json({ error: 'Idempotency conflict' }, { status: 409 });
          }

          // Check body hash match
          if (existing.requestHash !== requestHash) {
            return NextResponse.json(
              { error: 'Idempotency key reused with different payload' },
              { status: 409 }
            );
          }

          // If completed, return cached response
          if (existing.status === 'completed' && existing.response) {
            return NextResponse.json(existing.response, { status: 200 });
          }

          // If lease active, return 425 / 409
          if (existing.status === 'in_progress' && existing.leaseExpiresAt > new Date()) {
            return NextResponse.json(
              { error: 'Order is currently being processed. Please wait a moment.' },
              { status: 425 }
            );
          }

          // Lease expired: reclaim
          existing.leaseExpiresAt = new Date(Date.now() + 60 * 1000);
          await existing.save();
          idempotencyDoc = existing;
        } else {
          throw err;
        }
      }
    }

    const customerName = (body.customerName || body.shippingAddress?.fullName || ctx?.name || '').trim() || 'Customer';
    const customerPhone = (body.customerPhone || body.shippingAddress?.phone || ctx?.phone || '').trim();
    const customerEmail = (body.customerEmail || ctx?.email || '').trim() || undefined;

    // Mobile number regex validation
    if (!customerPhone || !/^[6-9]\d{9}$/.test(customerPhone.replace(/\D/g, '').slice(-10))) {
      if (idempotencyDoc) await IdempotencyKeyModel.deleteOne({ _id: idempotencyDoc._id });
      return NextResponse.json({ error: 'Please enter a valid 10-digit Indian mobile number' }, { status: 400 });
    }

    // COD toggle & order limit check
    if (body.paymentPreference === 'cod') {
      const isCodEnabled = settings?.codEnabled ?? settings?.enableCod ?? true;
      if (!isCodEnabled) {
        if (idempotencyDoc) await IdempotencyKeyModel.deleteOne({ _id: idempotencyDoc._id });
        return NextResponse.json(
          { error: 'Cash on Delivery is currently disabled by store administration. Please select online payment.' },
          { status: 400 }
        );
      }
      const maxCodPaise = serverEnv.COD_MAX_ORDER_VALUE_PAISE || 500000;
      if (Number(body.totalPaise) > maxCodPaise) {
        if (idempotencyDoc) await IdempotencyKeyModel.deleteOne({ _id: idempotencyDoc._id });
        return NextResponse.json(
          { error: `Cash on Delivery is only available for orders up to ₹${maxCodPaise / 100}. Please choose online payment.` },
          { status: 400 }
        );
      }
    }

    // Create order atomically
    const order = await orderService.createOrder({
      customerId: ctx?.id || body.customerId || undefined,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress: body.shippingAddress,
      deliveryMethod: body.deliveryMethod || 'standard',
      paymentPreference: body.paymentPreference || 'cod',
      items: (body.items || []).map((i: any) => ({
        ...i,
        variantId: i.variantId || i._id?.toString() || `${i.productId || 'p'}_${i.size || 'std'}_${i.sku || 'item'}`,
        sku: i.sku || 'SKU-STD',
      })),
      subtotalPaise: Number(body.subtotalPaise) || 0,
      discountPaise: Number(body.discountPaise) || 0,
      deliveryFeePaise: Number(body.deliveryFeePaise) || 0,
      totalPaise: Number(body.totalPaise) || 0,
      couponCode: body.couponCode,
      notes: body.notes,
      idempotencyKey: idempotencyKey || undefined,
    });

    const successResponse = { success: true, order };

    // Mark idempotency key completed
    if (idempotencyDoc) {
      idempotencyDoc.status = 'completed';
      idempotencyDoc.orderId = order.id;
      idempotencyDoc.response = successResponse;
      await idempotencyDoc.save();
    }

    return NextResponse.json(successResponse, { status: 201 });
  } catch (err: any) {
    console.error('Order creation failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to place order' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const {
      orderId,
      fulfilmentStatus,
      paymentStatus,
      orderStatus,
      trackingNumber,
      assignedRider,
      adminNote,
      actor,
    } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const updatedOrder = await orderService.manualUpdateOrder(
      orderId,
      {
        fulfilmentStatus,
        paymentStatus,
        orderStatus,
        trackingNumber,
        assignedRider,
        adminNote,
      },
      actor || 'Operations Admin'
    );

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    const status = err?.statusCode || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
