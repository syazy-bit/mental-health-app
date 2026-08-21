import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MindBridge — Student Mental Health & Emotional Support',
  description:
    'Confidential, anonymous mental health support for university students. Empathetic AI listening, evidence-based PHQ-9 & GAD-7 screenings, verified crisis resources, and licensed counseling booking.',
  applicationName: 'MindBridge',
  authors: [{ name: 'University Well-being Service' }],
  keywords: [
    'student mental health',
    'university counseling',
    'anonymous support',
    'PHQ-9 screening',
    'GAD-7 screening',
    'crisis helplines',
    'emotional listening',
  ],
};

export const viewport: Viewport = {
  themeColor: '#0D5C56',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased selection:bg-[#CCFBF1] selection:text-[#0D5C56]">
      <body className="min-h-full flex flex-col bg-[#FAF9F6] text-[#19232D]">
        {children}
      </body>
    </html>
  );
}