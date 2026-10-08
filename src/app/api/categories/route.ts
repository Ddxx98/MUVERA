import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const categories = await db.getCategories();
    return NextResponse.json({ categories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save category' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const category = await db.saveCategory(body);
    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Category ID or slug is required' }, { status: 400 });
    }

    await db.deleteCategory(id);
    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete category' }, { status: 500 });
  }
}
