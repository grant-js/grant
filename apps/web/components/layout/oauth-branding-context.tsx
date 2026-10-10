'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  type ProjectOAuthBranding,
  readProjectOAuthBrandingForLocation,
} from '@/lib/project-oauth-branding';

export type OAuthBrandingTheme = ProjectOAuthBranding;

interface OAuthBrandingContextValue {
  branding: OAuthBrandingTheme | null;
  setBranding: (branding: OAuthBrandingTheme | null) => void;
}

const OAuthBrandingContext = createContext<OAuthBrandingContextValue | null>(null);

export function OAuthBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<OAuthBrandingTheme | null>(
    readProjectOAuthBrandingForLocation
  );
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

  useLayoutEffect(() => {
    if (!setBranding || !hasBranding) return;
    setBranding({
      pictureUrl,
      projectName,
      primaryColor,
      showHelpPanel: showHelpPanel ?? true,
      themeMode,
    });
  }, [setBranding, hasBranding, pictureUrl, projectName, primaryColor, showHelpPanel, themeMode]);
}

export function useClearOAuthBrandingWhen(shouldClear: boolean) {
  const setBranding = useContext(OAuthBrandingContext)?.setBranding;
  useLayoutEffect(() => {
    if (!setBranding || !shouldClear) return;
    setBranding(null);
  }, [setBranding, shouldClear]);
}
