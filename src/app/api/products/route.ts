import { NextResponse } from 'next/server';
import { catalogService } from '@/modules/catalog';
import { Product } from '@/lib/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const brand = searchParams.get('brand') || undefined;
  const search = searchParams.get('search') || undefined;

  const products = await catalogService.getProducts({ category, brand, search });
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  try {
    const product: Product = await req.json();
    const saved = await catalogService.upsertProduct(product, 'Admin API');
    return NextResponse.json({ success: true, product: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
