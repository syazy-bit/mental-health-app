import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';

const fontHeading = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'MindBridge — Find Your Calm',
  description:
    'Simple, confidential tools for a balanced mind. Empathetic AI listening, evidence-based PHQ-9 & GAD-7 screenings, verified crisis resources, and licensed counseling booking.',
  applicationName: 'MindBridge',
  authors: [{ name: 'University Well-being Service' }],
  keywords: [
    'student mental health',
    'university counseling',
    'anonymous support',
    'mindfulness',
    'PHQ-9 screening',
    'GAD-7 screening',
    'crisis helplines',
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9F6F0' },
    { media: '(prefers-color-scheme: dark)', color: '#121A17' },
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
      className={`${fontHeading.variable} ${fontBody.variable} h-full antialiased selection:bg-[#CCFBF1] selection:text-[#0D5C56] dark:selection:bg-[#1A3734] dark:selection:text-[#57ADA3]`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}