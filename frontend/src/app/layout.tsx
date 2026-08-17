import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/shell/AppShell';

export const metadata: Metadata = {
  title: 'MindBridge — Student Mental Health & Emotional Support',
  description:
    'Confidential, anonymous mental health support for students. AI-assisted emotional listening, evidence-based PHQ-9 & GAD-7 screenings, and verified crisis resources.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-slate-800">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
