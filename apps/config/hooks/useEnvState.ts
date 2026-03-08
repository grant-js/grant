'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EnvStateResponse } from '@/app/types/env';
import type { EnvCategoryId } from '@/lib/env-metadata';
import { getEnvVarMeta } from '@/lib/env-metadata';
import { getPortFromAppUrl, normalizeAppUrl, setPortInAppUrl } from '@/lib/app-url-port';
import { computeDbUrlFromPostgres } from '@/lib/db-url';
import { validateEnvValue } from '@/lib/env-schemas';
import { generateSecurePassword } from '@/lib/generate-password';

export function useEnvState() {
  const [data, setData] = useState<EnvStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EnvCategoryId>('docker');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [editingMulti, setEditingMulti] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [useDockerDb, setUseDockerDb] = useState(false);
  const [testDbStatus, setTestDbStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [testDbMessage, setTestDbMessage] = useState<string>('');
  const [openSelectKey, setOpenSelectKey] = useState<string | null>(null);

  useEffect(() => {
    if (!openSelectKey) return;
    const close = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.('[data-custom-select]');
      if (el && (el as HTMLElement).getAttribute('data-custom-select') === openSelectKey) return;
      setOpenSelectKey(null);
    };
    const id = setTimeout(() => {
      document.addEventListener('mousedown', close);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', close);
    };
  }, [openSelectKey]);

  const fetchEnv = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/env');
      if (!res.ok) throw new Error(await res.text());
      const json: EnvStateResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnv();
  }, [fetchEnv]);

  const getVar = useCallback(
    (key: string) => editing[key] ?? data?.vars.find((v) => v.key === key)?.value ?? '',
    [data, editing]
  );

  const getMultiVar = useCallback(
    (key: string): string[] => {
      if (editingMulti[key] !== undefined) return editingMulti[key];
      const raw = getVar(key) || '';
      const parts = raw.split(',').map((s) => s.trim());
      return parts.length > 0 ? parts : [''];
    },
    [editingMulti, getVar]
  );

  const onMultiVarChange = useCallback((key: string, values: string[]) => {
    setEditingMulti((prev) => ({ ...prev, [key]: values }));
  }, []);

  const addMultiVarItem = useCallback(
    (key: string) => {
      onMultiVarChange(key, [...getMultiVar(key), '']);
    },
    [getMultiVar, onMultiVarChange]
  );

  const removeMultiVarItem = useCallback(
    (key: string, index: number) => {
      const next = getMultiVar(key).filter((_, i) => i !== index);
      onMultiVarChange(key, next.length > 0 ? next : ['']);
    },
    [getMultiVar, onMultiVarChange]
  );

  const handleReset = useCallback((key: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditingMulti((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const computedDbUrl =
    useDockerDb && data
      ? computeDbUrlFromPostgres(
          getVar('POSTGRES_DB'),
          getVar('POSTGRES_USER'),
          getVar('POSTGRES_PASSWORD')
        )
      : '';

  const handleGenerateSystemUserId = useCallback(() => {
    setEditing((prev) => ({ ...prev, SYSTEM_USER_ID: crypto.randomUUID() }));
  }, []);

  const handleGeneratePassword = useCallback((key: string) => {
    setEditing((prev) => ({ ...prev, [key]: generateSecurePassword() }));
  }, []);

  const handleTestDbConnection = useCallback(async (dbUrl: string) => {
    const validation = validateEnvValue('DB_URL', dbUrl);
    if (!validation.success) {
      setTestDbStatus('error');
      setTestDbMessage(validation.error);
      return;
    }
    if (!dbUrl.trim()) {
      setTestDbStatus('error');
      setTestDbMessage('DB_URL is required');
      return;
    }
    setTestDbStatus('loading');
    setTestDbMessage('');
    try {
      const res = await fetch('/api/env/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbUrl: dbUrl.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        setTestDbStatus('success');
        setTestDbMessage('Connection successful');
      } else {
        setTestDbStatus('error');
        setTestDbMessage(json.error ?? 'Connection failed');
      }
    } catch (e) {
      setTestDbStatus('error');
      setTestDbMessage(e instanceof Error ? e.message : 'Request failed');
    }
  }, []);

  const handleUseDockerDbChange = useCallback(
    (checked: boolean) => {
      setUseDockerDb(checked);
      if (checked && data) {
        const url = computeDbUrlFromPostgres(
          getVar('POSTGRES_DB'),
          getVar('POSTGRES_USER'),
          getVar('POSTGRES_PASSWORD')
        );
        if (url) {
          fetch('/api/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'DB_URL', value: url }),
          })
            .then((r) => r.json())
            .then((json) => json.ok && fetchEnv());
        }
      }
    },
    [data, getVar, fetchEnv]
  );

  const handleSave = useCallback(
    async (key: string) => {
      if (!data) return;
      const meta = getEnvVarMeta(key);
      let value: string;
      if (meta?.multiValueSeparator) {
        value = getMultiVar(key)
          .filter((s) => s.trim() !== '')
          .join(meta.multiValueSeparator);
      } else {
        value = editing[key] ?? data.vars.find((v) => v.key === key)?.value ?? '';
      }
      if (key === 'APP_URL') value = normalizeAppUrl(value);
      const validation = validateEnvValue(key, value);
      if (!validation.success) {
        setValidationErrors((prev) => ({ ...prev, [key]: validation.error }));
        return;
      }
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setSaving(key);
      try {
        const res = await fetch('/api/env', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? 'Save failed');
        setEditing((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setEditingMulti((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        await fetchEnv();
        if (key === 'APP_URL') {
          const port = getPortFromAppUrl(value);
          const resPort = await fetch('/api/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'APP_PORT', value: String(port) }),
          });
          const jsonPort = await resPort.json();
          if (jsonPort.ok) await fetchEnv();
        } else if (key === 'APP_PORT') {
          const appUrl = getVar('APP_URL');
          const newAppUrl = setPortInAppUrl(appUrl, parseInt(value, 10));
          if (newAppUrl) {
            const resUrl = await fetch('/api/env', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'APP_URL', value: newAppUrl }),
            });
            const jsonUrl = await resUrl.json();
            if (jsonUrl.ok) await fetchEnv();
          }
        }
        if (useDockerDb && ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'].includes(key)) {
          const db = key === 'POSTGRES_DB' ? value : getVar('POSTGRES_DB');
          const user = key === 'POSTGRES_USER' ? value : getVar('POSTGRES_USER');
          const pass = key === 'POSTGRES_PASSWORD' ? value : getVar('POSTGRES_PASSWORD');
          const newDbUrl = computeDbUrlFromPostgres(db, user, pass);
          if (newDbUrl) {
            const resDb = await fetch('/api/env', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: 'DB_URL', value: newDbUrl }),
            });
            const jsonDb = await resDb.json();
            if (jsonDb.ok) await fetchEnv();
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(null);
      }
    },
    [data, editing, useDockerDb, getVar, getMultiVar, fetchEnv]
  );

  const handleBlur = useCallback((key: string, value: string) => {
    const validation = validateEnvValue(key, value);
    if (validation.success) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      setValidationErrors((prev) => ({ ...prev, [key]: validation.error }));
    }
  }, []);

  const isCategoryMisconfigured = useCallback(
    (categoryId: EnvCategoryId): boolean => {
      if (!data) return false;
      return data.vars.some((v) => {
        const m = data.meta.find((x) => x.key === v.key);
        if (m?.category !== categoryId) return false;
        const value = editing[v.key] ?? v.value;
        const missingOrEmpty =
          (m.required &&
            (v.status === 'missing' || v.status === 'empty' || (value?.trim() ?? '') === '')) ??
          false;
        return missingOrEmpty || !!validationErrors[v.key];
      });
    },
    [data, editing, validationErrors]
  );

  return {
    data,
    loading,
    error,
    activeTab,
    setActiveTab,
    editing,
    setEditing,
    saving,
    validationErrors,
    useDockerDb,
    testDbStatus,
    testDbMessage,
    openSelectKey,
    setOpenSelectKey,
    getVar,
    getMultiVar,
    onMultiVarChange,
    addMultiVarItem,
    removeMultiVarItem,
    handleReset,
    computedDbUrl,
    fetchEnv,
    handleGenerateSystemUserId,
    handleGeneratePassword,
    handleTestDbConnection,
    handleUseDockerDbChange,
    handleSave,
    handleBlur,
    isCategoryMisconfigured,
  };
}
