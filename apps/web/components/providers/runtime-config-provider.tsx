'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { brandingStyleSheet, parseDeploymentBranding } from '@/lib/deployment-branding';
import {
  getRuntimeConfig,
  RUNTIME_CONFIG_DEFAULTS as DEFAULTS,
  type RuntimeConfig,
  setRuntimeConfig,
} from '@/lib/runtime-config';

const RuntimeConfigContext = createContext<RuntimeConfig>(DEFAULTS);
RuntimeConfigContext.displayName = 'RuntimeConfigContext';

/**
 * How long `fallback` waits for `/api/config` before the app renders with the defaults. Long
 * enough for a slow first request, short enough that an unreachable API is not a blank page.
 */
const RUNTIME_CONFIG_WAIT_MS = 3000;

interface RuntimeConfigProviderProps {
  children: ReactNode;
  /**
   * Rendered instead of `children` until `/api/config` answers, fails or times out. Set where the
   * first paint depends on the config (the deployment's header colours and logo), so the default
   * header never flashes before the branded one. Unset, children render at once with defaults.
   */
  fallback?: ReactNode;
}

/** Shape returned by GET /api/config. */
interface ConfigPayload {
  demoModeEnabled?: boolean;
  demoModeDbRefreshSchedule?: string;
  accountDeletionRetentionDays?: string;
  appVersion?: string;
  cdmUploadMaxBytes?: number;
  docsUrl?: string | null;
  apiReferenceEnabled?: boolean;
  graphqlPlaygroundEnabled?: boolean;
  branding?: unknown;
}

/**
 * Fetches GET /api/config for demo mode, privacy retention, app version, the CDM upload limit,
 * the docs site URL, which API surfaces are enabled, and the deployment branding.
 * Enables CSR to get deploy-time config without baking env into the image.
 */
export function RuntimeConfigProvider({ children, fallback }: RuntimeConfigProviderProps) {
  const [config, setConfig] = useState<RuntimeConfig>(DEFAULTS);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setRuntimeConfig(DEFAULTS);
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUNTIME_CONFIG_WAIT_MS);
    fetch('/api/config', { cache: 'no-store', signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Config fetch failed');
        return res.json();
      })
      .then((data: ConfigPayload) => {
        if (cancelled) return;
        const merged: RuntimeConfig = {
          demoModeEnabled: data.demoModeEnabled ?? DEFAULTS.demoModeEnabled,
          demoModeDbRefreshSchedule:
            data.demoModeDbRefreshSchedule ?? DEFAULTS.demoModeDbRefreshSchedule,
          accountDeletionRetentionDays:
            data.accountDeletionRetentionDays ?? DEFAULTS.accountDeletionRetentionDays,
          appVersion: data.appVersion ?? DEFAULTS.appVersion,
          cdmUploadMaxBytes:
            typeof data.cdmUploadMaxBytes === 'number' && data.cdmUploadMaxBytes > 0
              ? data.cdmUploadMaxBytes
              : DEFAULTS.cdmUploadMaxBytes,
          docsUrl:
            typeof data.docsUrl === 'string' && data.docsUrl.trim() ? data.docsUrl.trim() : null,
          apiReferenceEnabled: data.apiReferenceEnabled === true,
          graphqlPlaygroundEnabled: data.graphqlPlaygroundEnabled === true,
          branding: parseDeploymentBranding(data.branding),
        };
        setRuntimeConfig(merged);
        setConfig(merged);
      })
      .catch(() => {
        if (!cancelled) {
          setRuntimeConfig(DEFAULTS);
          setConfig(DEFAULTS);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelled) setSettled(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const brandingCss = brandingStyleSheet(config.branding);

  return (
    <RuntimeConfigContext.Provider value={config}>
      {brandingCss ? <style data-grant-branding="">{brandingCss}</style> : null}
      {fallback !== undefined && !settled ? fallback : children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig(): RuntimeConfig {
  const ctx = useContext(RuntimeConfigContext);
  return ctx ?? getRuntimeConfig();
}
