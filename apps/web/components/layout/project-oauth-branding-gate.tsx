'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { FullPageLoader } from '@/components/common';
import {
  useClearOAuthBrandingWhen,
  useSetOAuthBranding,
} from '@/components/layout/oauth-branding-context';
import { getProjectAppPublicInfo, getProjectConsentInfo } from '@/lib/project-oauth-api';
import {
  type ProjectOAuthBranding,
  isProjectOAuthBrandingPath,
  projectOAuthBrandingCacheKey,
  projectOAuthBrandingFromPublicInfo,
  readProjectOAuthBrandingCache,
  writeProjectOAuthBrandingCache,
} from '@/lib/project-oauth-branding';

type BrandingResolveState = {
  status: 'loading' | 'ready';
  branding: ProjectOAuthBranding | null;
};

function useResolvedProjectOAuthBranding(
  enabled: boolean,
  clientId: string | null,
  consentToken: string | null,
  scope: string | null,
  redirectUri: string | null
): BrandingResolveState {
  const cacheKey = projectOAuthBrandingCacheKey({ clientId, consentToken });
  const [state, setState] = useState<BrandingResolveState>(() => {
    if (!enabled || !cacheKey) return { status: 'ready', branding: null };
    const cached = readProjectOAuthBrandingCache(cacheKey);
    return cached ? { status: 'ready', branding: cached } : { status: 'loading', branding: null };
  });

  useEffect(() => {
    if (!enabled || !cacheKey) {
      setState({ status: 'ready', branding: null });
      return;
    }
    const cached = readProjectOAuthBrandingCache(cacheKey);
    if (cached) {
      setState({ status: 'ready', branding: cached });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading', branding: null });
    const load = clientId
      ? getProjectAppPublicInfo(clientId, scope, redirectUri).then(
          projectOAuthBrandingFromPublicInfo
        )
      : getProjectConsentInfo(consentToken!).then(projectOAuthBrandingFromPublicInfo);

    load
      .then((branding) => {
        writeProjectOAuthBrandingCache(cacheKey, branding);
        if (!cancelled) setState({ status: 'ready', branding });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'ready', branding: null });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, cacheKey, clientId, consentToken, scope, redirectUri]);

  return state;
}

export function ProjectOAuthBrandingGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const needsBranding = isProjectOAuthBrandingPath(pathname);
  const clientId = searchParams.get('client_id');
  const consentToken = searchParams.get('consent_token');
  const scope = searchParams.get('scope');
  const redirectUri = searchParams.get('redirect_uri');
  const resolved = useResolvedProjectOAuthBranding(
    needsBranding,
    clientId,
    consentToken,
    scope,
    redirectUri
  );

  useSetOAuthBranding(resolved.branding);
  useClearOAuthBrandingWhen(!needsBranding);

  if (needsBranding && resolved.status === 'loading') {
    return <FullPageLoader />;
  }

  return children;
}
