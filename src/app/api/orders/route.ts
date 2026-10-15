import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderService } from '@/modules/orders';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const order = await orderService.getOrderById(id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ order });
  }

  const orders = await orderService.getOrders();
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const customerName = (body.customerName || body.shippingAddress?.fullName || '').trim() || 'Customer';
    const customerPhone = (body.customerPhone || body.shippingAddress?.phone || '').trim();

    if (!customerPhone) {
      return NextResponse.json({ error: 'Customer mobile number is required' }, { status: 400 });
    }

    const order = await orderService.createOrder({
      customerName,
      customerPhone,
      customerEmail: body.customerEmail || undefined,
      shippingAddress: body.shippingAddress,
      deliveryMethod: body.deliveryMethod || 'standard',
      paymentPreference: body.paymentPreference || 'upi_whatsapp',
      items: body.items || [],
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
    const { orderId, fulfilmentStatus, paymentStatus, actor } = await req.json();

    let updatedOrder;
    if (fulfilmentStatus) {
      updatedOrder = await orderService.updateFulfillmentStatus(
        orderId,
        fulfilmentStatus,
        actor || 'Warehouse Staff'
      );
    }

    if (paymentStatus) {
      updatedOrder = await orderService.updatePaymentStatus(
        orderId,
        paymentStatus,
        actor || 'Finance Admin'
      );
    }

    if (!updatedOrder) {
      const order = await db.getOrderById(orderId);
      return NextResponse.json({ success: true, order });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
