import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/modules/notifications';
import { requireAdmin } from '@/modules/auth/guards';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { serverEnv } = await import('@/config/env.server');
    const apiKey = serverEnv.BREVO_API_KEY;
    const configured = Boolean(apiKey);

    return NextResponse.json({
      configured,
      provider: serverEnv.EMAIL_PROVIDER,
      senderEmail: serverEnv.EMAIL_FROM_ADDRESS,
      senderName: serverEnv.EMAIL_FROM_NAME,
    });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { name, subject, htmlContent, senderName, senderEmail, listIds, sendNow } = body;

    if (!name || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Name, subject, and htmlContent are required.' },
        { status: 400 }
      );
    }

    const result = await notificationService.createEmailCampaign({
      name,
      subject,
      htmlContent,
      senderName,
      senderEmail,
      listIds: listIds ? listIds.map(Number) : undefined,
      sendNow: Boolean(sendNow),
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status }
    );
  }
}
