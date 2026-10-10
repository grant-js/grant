'use client';

import { AuthLayout as AuthLayoutComponent, ProjectOAuthBrandingGate } from '@/components/layout';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Wraps auth pages (login, register, etc.). Redirect when authenticated and
 * ?redirect= persistence are handled centrally in SessionRestoreGate.
 * Project hosted sign-in waits for app-info/consent-info before painting AuthLayout.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <ProjectOAuthBrandingGate>
      <AuthLayoutComponent>{children}</AuthLayoutComponent>
    </ProjectOAuthBrandingGate>
  );
}
