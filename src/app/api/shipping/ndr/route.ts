import { NextRequest, NextResponse } from 'next/server';
import { verifyNdrToken, consumeNdrAttempt } from '@/modules/shipping/ndr-service';

export async function POST(req: NextRequest) {
  try {
    const { token, reattemptDate, alternatePhone, landmarkNotes } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const tokenData = verifyNdrToken(token);

    await consumeNdrAttempt(tokenData.shipmentId, tokenData.attempt, {
      reattemptDate,
      alternatePhone,
      landmarkNotes,
    });

    return NextResponse.json({
      success: true,
      message: 'Reattempt instructions submitted successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
