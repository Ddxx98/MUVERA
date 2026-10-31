import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/modules/auth/guards';

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // 1. Direct point query for single customer by ID (< 10ms)
    if (id) {
      const user = await db.getUserById(id);
      if (!user) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      // Query customer orders directly via indexed customerId or phone/email
      const userOrders = await db.getOrders({
        customerId: user.id,
        customerEmail: user.email,
        customerPhone: user.phone ? user.phone.slice(-10) : undefined,
      });

      const ordersCount = userOrders.length;
      const ltvPaise = userOrders.reduce((sum, o) => sum + o.totalPaise, 0);

      const defaultAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      const city = defaultAddr?.city || 'Bengaluru';
      const hub = defaultAddr?.pincode ? `Hub Pincode ${defaultAddr.pincode}` : 'Indiranagar Hub';

      let tier: string = user.loyaltyTier || 'Club Member';
      if (ltvPaise >= 1000000) {
        tier = 'MUVERA Black VIP';
      } else if (ltvPaise >= 500000) {
        tier = 'Gold Member';
      }

      return NextResponse.json({
        customer: {
          id: user.id,
          name: user.name || 'Member',
          phone: user.phone,
          email: user.email,
          role: user.role,
          city,
          hub,
          ordersCount,
          ltvPaise,
          tier,
          addresses: user.addresses || [],
          orders: userOrders,
          createdAt: user.createdAt,
        },
      });
    }

    const [users, orders] = await Promise.all([
      db.getUsers(),
      db.getOrders(),
    ]);

    // Calculate customer metrics from real database orders
    const customerStats = users.map((u) => {
      // Find orders matching this user by email or phone
      const userOrders = orders.filter((o) => {
        const phoneMatch = u.phone && o.customerPhone && o.customerPhone.includes(u.phone.slice(-10));
        const emailMatch = u.email && o.customerEmail && o.customerEmail.toLowerCase() === u.email.toLowerCase();
        return phoneMatch || emailMatch;
      });

      const ordersCount = userOrders.length;
      const ltvPaise = userOrders.reduce((sum, o) => sum + o.totalPaise, 0);

      // Default address
      const defaultAddr = u.addresses?.find((a) => a.isDefault) || u.addresses?.[0];
      const city = defaultAddr?.city || 'Bengaluru';
      const hub = defaultAddr?.pincode ? `Hub Pincode ${defaultAddr.pincode}` : 'Indiranagar Hub';

      // Tier logic based on LTV
      let tier: string = u.loyaltyTier || 'Club Member';
      if (ltvPaise >= 1000000) {
        tier = 'MUVERA Black VIP';
      } else if (ltvPaise >= 500000) {
        tier = 'Gold Member';
      }

      return {
        id: u.id,
        name: u.name || 'Member',
        phone: u.phone,
        email: u.email,
        role: u.role,
        city,
        hub,
        ordersCount,
        ltvPaise,
        tier,
        createdAt: u.createdAt,
      };
    });

    return NextResponse.json({
      total: users.length,
      customers: customerStats,
    });
  } catch (err: any) {
    const status = err?.statusCode || (err?.code === 'UNAUTHORIZED' ? 401 : err?.code === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: err.message }, { status });
  }
}
