import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { notificationService } from '@/modules/notifications';
import { authService } from '@/modules/auth/service';
import { serverEnv } from '@/config/env.server';

async function checkAdmin() {
  const cookieStore = cookies();
  const token = cookieStore.get('muvera_session')?.value;
  const user = await authService.getSessionUser(token);
  if (!user || user.role !== 'admin') {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  const isAdmin = await checkAdmin();
  if (!isAdmin && serverEnv.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized. Admin privilege required.' }, { status: 401 });
  }

  const apiKey = serverEnv.BREVO_API_KEY;
  const configured = Boolean(apiKey);

  return NextResponse.json({
    configured,
    provider: serverEnv.EMAIL_PROVIDER,
    senderEmail: serverEnv.EMAIL_FROM_ADDRESS,
    senderName: serverEnv.EMAIL_FROM_NAME,
  });
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin();
  if (!isAdmin && serverEnv.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized. Admin privilege required.' }, { status: 401 });
  }

  try {
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
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
