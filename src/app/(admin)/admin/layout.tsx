import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserAction } from '@/modules/auth/actions';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Admin Portal — MUVERA Operations',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserAction();

  // Require authentication in all environments (no dev bypass)
  if (!user) {
    redirect('/login?callbackUrl=/admin&error=admin_required');
  }

  // Deny access to customers — admin role required
  if (user.role !== 'admin') {
    redirect('/login?error=admin_required');
  }

  return (
    <AdminShell user={user}>
      {children}
    </AdminShell>
  );
}
