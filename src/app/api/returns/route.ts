import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ReturnRequest } from '@/lib/types';

export async function GET() {
  try {
    const returns = await db.getReturns();
    return NextResponse.json({ returns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: ReturnRequest = await req.json();
    const saved = await db.saveReturn(body);
    return NextResponse.json({ success: true, return: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status, inspectionDecision } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing return id or status' }, { status: 400 });
    }

    const updated = await db.updateReturnStatus(id, status, inspectionDecision);
    if (!updated) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, return: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
