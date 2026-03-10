'use client';

import { usePathname } from 'next/navigation';

import { AuthAssistant, type AuthPageId } from '@/components/auth/auth-assistant';
import { ParticleMesh } from '@/components/auth/particle-mesh';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * Derives auth page id from pathname.
 * Auth pages under /auth/ (e.g. /en/auth/login -> 'login'), project OAuth at /auth/project, /auth/project/email, /auth/project/consent, verify-email at /en/verify-email, reset-password at /en/reset-password, invitations at /en/invitations/[token].
 */
function getAuthPageId(pathname: string | null): AuthPageId {
  if (!pathname) return null;
  const segments = pathname.split('/').filter(Boolean);
  // Verify-email lives at /[locale]/verify-email, not under /auth/
  if (segments.includes('verify-email')) return 'verifyEmail';
  // Reset password lives at /[locale]/reset-password (link from forgot-password email)
  if (segments.includes('reset-password')) return 'resetPassword';
  // Member invitation lives at /[locale]/invitations/[token]
  if (segments.includes('invitations')) return 'invitation';
  const authIndex = segments.indexOf('auth');
  const pageSegment =
    authIndex >= 0 && authIndex < segments.length - 1 ? segments[authIndex + 1] : null;
  // Project OAuth app flows: /auth/project, /auth/project/email, /auth/project/consent
  if (pageSegment === 'project') {
    const subSegment = authIndex + 2 < segments.length ? segments[authIndex + 2] : null;
    if (subSegment === 'email') return 'projectEmail';
    if (subSegment === 'consent') return 'projectConsent';
    return 'projectEntry';
  }
  if (pageSegment === 'login') return 'login';
  if (pageSegment === 'register') return 'register';
  if (pageSegment === 'forgot-password') return 'forgotPassword';
  return null;
}

/**
 * Minimal single-column layout for auth pages when embedded in popup/iframe (?display=popup).
 * No right panel, no main app nav; centered content only.
 */
export function AuthLayoutStandalone({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const pathname = usePathname();
  const pageId = getAuthPageId(pathname);

  return (
    <div className="min-h-[calc(100vh-3.5rem-1px)] grid lg:grid-cols-2">
      {/* Left side - Content */}
      <div className="flex items-center justify-center p-6 sm:p-4">
        <div className="w-full max-w-sm space-y-6">
          {(title || description) && (
            <div className="space-y-2">
              {title && <h1 className="text-3xl font-bold">{title}</h1>}
              {description && <p className="text-gray-500">{description}</p>}
            </div>
          )}
          {children}
        </div>
      </div>

      {/* Right side - Particle mesh and contextual help accordion */}
      <div
        className="hidden lg:flex flex-col items-center justify-center p-8 relative overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at center, rgb(96 165 250) 0%, rgb(59 130 246) 45%, rgb(37 99 235) 80%, rgb(29 78 216) 100%)',
        }}
      >
        {/* Animated particle mesh (connected nodes) */}
        <ParticleMesh className="pointer-events-none" />
        <div className="max-w-lg text-white relative z-10 flex flex-col items-center w-full">
          <AuthAssistant pageId={pageId} className="w-full" />
        </div>
      </div>
    </div>
  );
}
