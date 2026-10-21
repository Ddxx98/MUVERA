import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/modules/auth/guards';
import { revalidatePath } from 'next/cache';

export async function GET() {
  const start = performance.now();
  try {
    const categories = await db.getCategories();
    const duration = Math.round(performance.now() - start);

    const res = NextResponse.json({ categories });
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    res.headers.set('Server-Timing', `db;dur=${duration}`);
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const category = await db.saveCategory({
      name: body.name.trim(),
      slug: body.slug,
      image: body.image,
      description: body.description,
      order: body.order,
    });

    revalidatePath('/categories');
    revalidatePath('/');
    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    const status = err?.statusCode || (err?.code === 'UNAUTHORIZED' ? 401 : err?.code === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: err.message || 'Failed to save category' }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const category = await db.saveCategory(body);
    revalidatePath('/categories');
    revalidatePath('/');
    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    const status = err?.statusCode || (err?.code === 'UNAUTHORIZED' ? 401 : err?.code === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: err.message || 'Failed to update category' }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Category ID or slug is required' }, { status: 400 });
    }

    await db.deleteCategory(id);
    revalidatePath('/categories');
    revalidatePath('/');
    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (err: any) {
    const status = err?.statusCode || (err?.code === 'UNAUTHORIZED' ? 401 : err?.code === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: err.message || 'Failed to delete category' }, { status });
  }
}
