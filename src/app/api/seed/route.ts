import { NextResponse } from 'next/server';
import { initialProducts, initialInventory, initialOrders, initialCoupons } from '@/lib/seed-data';
import { ProductModel, InventoryModel, OrderModel, CouponModel } from '@/lib/models';
import { db } from '@/lib/db';
import { env } from '@/config/env';

export async function GET() {
  try {
    if (env.mongoUri) {
      // Seed Mongoose collections
      await ProductModel.deleteMany({});
      await InventoryModel.deleteMany({});
      await OrderModel.deleteMany({});
      await CouponModel.deleteMany({});

      await ProductModel.insertMany(initialProducts);
      await InventoryModel.insertMany(initialInventory);
      await OrderModel.insertMany(initialOrders);
      await CouponModel.insertMany(initialCoupons);

      return NextResponse.json({
        success: true,
        message: 'Successfully seeded MongoDB Atlas with full luxury streetwear catalog & inventory!',
        productsCount: initialProducts.length,
        inventoryCount: initialInventory.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Running in high-speed in-memory database mode with all seed products, inventory & orders active.',
      productsCount: initialProducts.length,
      inventoryCount: initialInventory.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
