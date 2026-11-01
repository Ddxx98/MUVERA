import { connectToMongo } from '@/lib/db';
import { RefundModel, OrderModel } from '@/lib/models';
import { serverEnv } from '@/config/env.server';
import { auditService } from '@/modules/audit/service';

export async function processRefundJob(payload: {
  paymentId: string;
  amountPaise: number;
  orderId: string;
  reason: string;
}): Promise<void> {
  await connectToMongo();
  const { paymentId, amountPaise, orderId, reason } = payload;

  const order = await OrderModel.findOne({
    $or: [{ id: orderId }, { orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
  });

  const refund: any = await RefundModel.findOne({
    paymentId,
    reason: reason as any,
    status: 'pending',
  });

  const keyId = serverEnv.RAZORPAY_KEY_ID;
  const keySecret = serverEnv.RAZORPAY_KEY_SECRET;

  let gatewayRefundId = `rfnd_mock_${Date.now()}`;

  if (keyId && keySecret && !paymentId.startsWith('pay_mock_') && !paymentId.startsWith('pay_order_')) {
    try {
      const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          notes: {
            orderId,
            reason,
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[PROCESS_REFUND] Razorpay refund API failed (${res.status}):`, errorText);
        if (refund) {
          refund.status = 'failed';
          refund.error = errorText;
          await refund.save();
        }
        throw new Error(`Razorpay refund failed: ${errorText}`);
      }

      const data = await res.json();
      gatewayRefundId = data.id;
    } catch (err: any) {
      if (refund) {
        refund.status = 'failed';
        refund.error = err.message;
        await refund.save();
      }
      throw err;
    }
  }

  if (refund) {
    refund.status = 'processed';
    refund.gatewayRefundId = gatewayRefundId;
    await refund.save();
  }

  if (order) {
    order.paymentStatus = 'refunded';
    order.timeline.push({
      id: `ev_${Date.now()}_refund_processed`,
      status: 'refunded' as any,
      description: `Refund of ₹${(amountPaise / 100).toFixed(2)} processed (${gatewayRefundId}). Reason: ${reason}.`,
      actor: 'Razorpay Refund Engine',
      createdAt: new Date().toISOString(),
    });
    await order.save();
  }

  await auditService.recordAudit({
    action: 'REFUND_PROCESSED',
    entity: 'order',
    entityId: orderId,
    actor: 'system_payments',
    metadata: {
      orderId,
      paymentId,
      amountPaise,
      gatewayRefundId,
      reason,
    },
  });
}
