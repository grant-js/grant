'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { getRuntimeConfig, type RuntimeConfig, setRuntimeConfig } from '@/lib/runtime-config';

const DEFAULTS: RuntimeConfig = {
  demoModeEnabled: false,
  demoModeDbRefreshSchedule: '0 0 */2 * *',
  accountDeletionRetentionDays: '30',
  appVersion: 'dev',
};

const RuntimeConfigContext = createContext<RuntimeConfig>(DEFAULTS);
RuntimeConfigContext.displayName = 'RuntimeConfigContext';

interface RuntimeConfigProviderProps {
  children: ReactNode;
}

/** Shape returned by GET /api/config (non-URL only; keeps images reusable). */
interface ConfigPayload {
  demoModeEnabled?: boolean;
  demoModeDbRefreshSchedule?: string;
  accountDeletionRetentionDays?: string;
  appVersion?: string;
}

/**
 * Fetches GET /api/config for demo mode, privacy retention, and app version.
 * Enables CSR to get deploy-time config without baking env into the image.
 */
export function RuntimeConfigProvider({ children }: RuntimeConfigProviderProps) {
  const [config, setConfig] = useState<RuntimeConfig>(DEFAULTS);

  useEffect(() => {
    setRuntimeConfig(DEFAULTS);
    let cancelled = false;
    fetch('/api/config', { cache: 'no-store' })
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
        };
        setRuntimeConfig(merged);
        setConfig(merged);
      })
      .catch(() => {
        if (!cancelled) {
          setRuntimeConfig(DEFAULTS);
          setConfig(DEFAULTS);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <RuntimeConfigContext.Provider value={config}>{children}</RuntimeConfigContext.Provider>;
}

export function useRuntimeConfig(): RuntimeConfig {
  const ctx = useContext(RuntimeConfigContext);
  return ctx ?? getRuntimeConfig();
}
