'use client';

import { Geist, Geist_Mono } from 'next/font/google';

import { ApolloProvider, GrantProvider, ThemeProvider } from '@/components/providers';
import { Toast } from '@/components/ui/toast';
import './globals.css';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ApolloProvider>
            <GrantProvider>
              {children}
              <Toast />
            </GrantProvider>
          </ApolloProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
