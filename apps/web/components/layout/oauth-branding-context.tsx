'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ProjectOAuthThemeMode } from '@grantjs/schema';
import type { ReactNode } from 'react';

export type OAuthBrandingTheme = {
  pictureUrl: string | null;
  projectName: string | null;
  primaryColor: string | null;
  showHelpPanel: boolean;
  themeMode: ProjectOAuthThemeMode | null;
};

interface OAuthBrandingContextValue {
  branding: OAuthBrandingTheme | null;
  setBranding: (branding: OAuthBrandingTheme | null) => void;
}

const OAuthBrandingContext = createContext<OAuthBrandingContextValue | null>(null);

export function OAuthBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<OAuthBrandingTheme | null>(null);
  const value = useMemo(() => ({ branding, setBranding }), [branding]);
  return <OAuthBrandingContext.Provider value={value}>{children}</OAuthBrandingContext.Provider>;
}

export function useOAuthBrandingTheme(): OAuthBrandingTheme | null {
  return useContext(OAuthBrandingContext)?.branding ?? null;
}

export function useSetOAuthBranding(branding: OAuthBrandingTheme | null) {
  const setBranding = useContext(OAuthBrandingContext)?.setBranding;
  const pictureUrl = branding?.pictureUrl ?? null;
  const projectName = branding?.projectName ?? null;
  const primaryColor = branding?.primaryColor ?? null;
  const showHelpPanel = branding?.showHelpPanel;
  const themeMode = branding?.themeMode ?? null;
  const hasBranding = branding != null;

  useEffect(() => {
    if (!setBranding) return;
    setBranding(
      hasBranding
        ? {
            pictureUrl,
            projectName,
            primaryColor,
            showHelpPanel: showHelpPanel ?? true,
            themeMode,
          }
        : null
    );
    return () => setBranding(null);
  }, [setBranding, hasBranding, pictureUrl, projectName, primaryColor, showHelpPanel, themeMode]);
}
