import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Seed mock data is disabled for production. Please add and manage products directly via the Admin Dashboard.',
  });
}
