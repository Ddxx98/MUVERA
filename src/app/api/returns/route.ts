import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ReturnRequest } from '@/lib/types';
import { requireAdmin, requireCustomer } from '@/modules/auth/guards';

export async function GET() {
  try {
    // Returns list is admin-only
    await requireAdmin();
    const returns = await db.getReturns();
    return NextResponse.json({ returns });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    // Customers initiate returns; must be authenticated
    const ctx = await requireCustomer();
    const body: ReturnRequest = await req.json();
    const saved = await db.saveReturn(body);
    return NextResponse.json({ success: true, return: saved });
  } catch (err: any) {
    const status = err?.statusCode || 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    // Inspection decisions are admin-only
    await requireAdmin();
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
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
