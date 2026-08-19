import type { Metadata } from 'next';
import { AdminSessionProvider } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'MindBridge Admin Portal',
  description:
    'University counseling administration portal. Booking management, counselor profiles, and availability scheduling.',
  robots: { index: false, follow: false },
};

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminSessionProvider>
      <AdminShell>{children}</AdminShell>
    </AdminSessionProvider>
  );
}