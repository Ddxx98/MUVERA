'use server';

import { orderService, CreateOrderInput } from './service';
import { handleActionError, ServiceResult } from '@/lib/errors';
import { OrderSnapshot } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Server Action: Place a new order with stock hold and payment intent.
 */
export async function placeOrderAction(input: CreateOrderInput): Promise<ServiceResult<OrderSnapshot>> {
  try {
    const order = await orderService.createOrder(input);
    revalidatePath('/account/orders');
    revalidatePath('/admin/orders');
    return { ok: true, data: order };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Advance fulfillment stage (admin only).
 */
export async function advanceFulfillmentAction(
  orderId: string,
  nextStatus: string,
  actor: string
): Promise<ServiceResult<OrderSnapshot>> {
  try {
    const updated = await orderService.updateFulfillmentStatus(orderId, nextStatus, actor);
    revalidatePath(`/admin/orders`);
    revalidatePath(`/account/orders/${orderId}`);
    return { ok: true, data: updated };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Mark order payment verified (admin or webhook).
 */
export async function verifyPaymentAction(
  orderId: string,
  actor: string
): Promise<ServiceResult<OrderSnapshot>> {
  try {
    const updated = await orderService.updatePaymentStatus(orderId, 'paid', actor);
    revalidatePath(`/admin/orders`);
    revalidatePath(`/account/orders/${orderId}`);
    return { ok: true, data: updated };
  } catch (err) {
    return handleActionError(err);
  }
}
