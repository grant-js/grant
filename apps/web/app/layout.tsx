'use client';

import './globals.css';

import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';

import { OAuthBrandingProvider } from '@/components/layout';
import { ThemeProvider } from '@/components/providers';
import { Toast } from '@/components/ui/toast';
import { PROJECT_OAUTH_BRANDING_STORAGE_KEY } from '@/lib/project-oauth-branding';

// Run before paint so system preference — or a cached project OAuth themeMode — is applied first.
const THEME_SCRIPT = `(function(){try{var cached=null;try{cached=JSON.parse(sessionStorage.getItem('${PROJECT_OAUTH_BRANDING_STORAGE_KEY}')||'null');}catch(e){}var params=new URLSearchParams(window.location.search);var id=params.get('client_id');var token=params.get('consent_token');var key=id?'client:'+id:token?'consent:'+token:null;var mode=cached&&key&&cached.cacheKey===key&&cached.branding?cached.branding.themeMode:null;var t=(mode==='light'||mode==='dark'||mode==='system')?mode:(localStorage.getItem('theme')||'system');var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`;

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
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <OAuthBrandingProvider>
          <ThemeProvider>
            <>
              {children}
              <Toast />
            </>
          </ThemeProvider>
        </OAuthBrandingProvider>
      </body>
    </html>
  );
}
