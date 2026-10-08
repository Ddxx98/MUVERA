import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserAction } from '@/modules/auth/actions';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserAction();

  // If user is logged in as a normal customer, strictly deny access
  if (user && user.role !== 'admin') {
    redirect('/login?error=admin_required');
  }

  // In production, require authentication for admin portal
  if (process.env.NODE_ENV === 'production' && !user) {
    redirect('/login?callbackUrl=/admin&error=admin_required');
  }

  return (
    <AdminShell user={user}>
      {children}
    </AdminShell>
  );
}
