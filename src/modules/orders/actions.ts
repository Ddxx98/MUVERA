'use server';

import { cookies } from 'next/headers';
import { orderService, CreateOrderInput } from './service';
import { authService } from '@/modules/auth/service';
import { handleActionError, ServiceResult } from '@/lib/errors';
import { OrderSnapshot } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const ADMIN_COOKIE_NAME = 'muvera_admin_session';
const CUSTOMER_COOKIE_NAME = 'muvera_session';

/**
 * Server Action: Place a new order with stock hold and payment intent.
 */
export async function placeOrderAction(input: CreateOrderInput): Promise<ServiceResult<OrderSnapshot>> {
  try {
    let customerId = input.customerId;
    if (!customerId) {
      const token = cookies().get(CUSTOMER_COOKIE_NAME)?.value || cookies().get(ADMIN_COOKIE_NAME)?.value;
      if (token) {
        const user = await authService.getSessionUser(token);
        if (user) {
          customerId = user.id;
        }
      }
    }
    const order = await orderService.createOrder({
      ...input,
      customerId,
    });
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
