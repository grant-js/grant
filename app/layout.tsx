import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';
import { ApolloProvider } from '@/components/providers/ApolloProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toast } from '@/components/ui/toast';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Identity Central',
  description: 'Unified identity management across multiple authentication systems.',
  icons: {
    icon: [{ url: '/favicon.svg?v=3', type: 'image/svg+xml' }, { url: '/favicon.svg?v=3' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ApolloProvider>
            {children}
            <Toast />
          </ApolloProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
