import { AppShell } from '@/components/shell/AppShell';
import { AuthProvider } from '@/components/auth/AuthProvider';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}