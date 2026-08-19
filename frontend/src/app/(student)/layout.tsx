import { AppShell } from '@/components/shell/AppShell';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}