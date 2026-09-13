'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

import { useOAuthBrandingTheme } from '@/components/layout/oauth-branding-context';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const branding = useOAuthBrandingTheme();
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      forcedTheme={branding?.themeMode ?? undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
