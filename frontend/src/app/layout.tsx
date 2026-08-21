import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF9F6' },
    { media: '(prefers-color-scheme: dark)', color: '#101817' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('mh_theme');
    var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased selection:bg-[#CCFBF1] selection:text-[#0D5C56] dark:selection:bg-[#1A3734] dark:selection:text-[#4FA79D]"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-150">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}