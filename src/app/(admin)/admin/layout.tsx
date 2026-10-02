import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserAction } from '@/modules/auth/actions';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

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
    <div className="flex min-h-screen bg-surface-base text-text-surface -mt-20">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader user={user} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
