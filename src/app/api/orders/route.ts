import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderService } from '@/modules/orders';
import { requireAdmin, requireCustomer, getOptionalUser } from '@/modules/auth/guards';
import { AppError } from '@/lib/errors';

export async function GET(req: Request) {
  try {
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
        const ownerEmail = order.customerEmail || '';
        const ownerPhone = (order.customerPhone || '').replace(/\D/g, '').slice(-10);
        const userPhone = (ctx.phone || '').replace(/\D/g, '').slice(-10);
        const emailMatch = ownerEmail && ctx.email.toLowerCase() === ownerEmail.toLowerCase();
        const phoneMatch = ownerPhone && userPhone && userPhone === ownerPhone;
        if (!emailMatch && !phoneMatch) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      return NextResponse.json({ order });
    }

    // Listing orders:
    const ctx = await getOptionalUser();
    if (!ctx) {
      return NextResponse.json({ error: 'Authentication required to view orders' }, { status: 401 });
    }

    // Admins see all store orders
    if (ctx.role === 'admin') {
      const orders = await orderService.getOrders();
      return NextResponse.json({ orders });
    }

    // Authenticated customers see only their own orders (matching email or mobile)
    const allOrders = await orderService.getOrders();
    const userPhone = (ctx.phone || '').replace(/\D/g, '').slice(-10);
    const userEmail = (ctx.email || '').toLowerCase().trim();

    const customerOrders = allOrders.filter((o) => {
      const orderEmail = (o.customerEmail || '').toLowerCase().trim();
      const orderPhone = (o.customerPhone || '').replace(/\D/g, '').slice(-10);
      const emailMatch = Boolean(userEmail && orderEmail && userEmail === orderEmail);
      const phoneMatch = Boolean(userPhone && orderPhone && userPhone === orderPhone);
      return emailMatch || phoneMatch;
    });

    return NextResponse.json({ orders: customerOrders });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Failed to fetch orders' }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getOptionalUser();
    const body = await req.json();

    const customerName = (body.customerName || body.shippingAddress?.fullName || ctx?.name || '').trim() || 'Customer';
    const customerPhone = (body.customerPhone || body.shippingAddress?.phone || ctx?.phone || '').trim();
    const customerEmail = (body.customerEmail || ctx?.email || '').trim() || undefined;

    if (!customerPhone) {
      return NextResponse.json({ error: 'Customer mobile number is required' }, { status: 400 });
    }

    const order = await orderService.createOrder({
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress: body.shippingAddress,
      deliveryMethod: body.deliveryMethod || 'standard',
      paymentPreference: body.paymentPreference || 'upi_whatsapp',
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
    });

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    console.error('Order creation failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to place order' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    // Status updates are admin-only
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
