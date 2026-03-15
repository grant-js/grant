'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import type { EnvStateResponse } from '@/app/types/env';
import { getPortFromAppUrl, normalizeAppUrl, setPortInAppUrl } from '@/lib/app-url-port';
import { computeDbUrlFromPostgres } from '@/lib/db-url';
import type { EnvEnvironment } from '@/lib/env-files';
import type { EnvCategoryId } from '@/lib/env-metadata';
import { getEnvVarMeta } from '@/lib/env-metadata';
import { validateEnvValue } from '@/lib/env-schemas';
import { generateSecurePassword } from '@/lib/generate-password';

function parseEnvironment(value: string | null): EnvEnvironment {
  if (value === 'demo' || value === 'test') return value;
  return 'default';
}

export function useEnvState() {
  const searchParams = useSearchParams();
  const selectedEnvironment: EnvEnvironment = parseEnvironment(searchParams.get('env'));

  const [data, setData] = useState<EnvStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EnvCategoryId>('main');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [editingMulti, setEditingMulti] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [useDockerDb, setUseDockerDb] = useState(false);
  const [useAppUrlForFrontend, setUseAppUrlForFrontend] = useState(false);
  const [testDbStatus, setTestDbStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [testDbMessage, setTestDbMessage] = useState<string>('');
  const [testHealthStatus, setTestHealthStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [testHealthMessage, setTestHealthMessage] = useState<string>('');
  const [testRedisStatus, setTestRedisStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [testRedisMessage, setTestRedisMessage] = useState<string>('');
  const [testGithubOAuthStatus, setTestGithubOAuthStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [testGithubOAuthMessage, setTestGithubOAuthMessage] = useState<string>('');
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [testEmailMessage, setTestEmailMessage] = useState<string>('');
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
      const res = await fetch(`/api/env?environment=${selectedEnvironment}`);
      if (!res.ok) throw new Error(await res.text());
      const json: EnvStateResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, [selectedEnvironment]);

  useEffect(() => {
    fetchEnv();
  }, [fetchEnv]);

  const getVar = useCallback(
    (key: string) => editing[key] ?? data?.vars.find((v) => v.key === key)?.value ?? '',
    [data, editing]
  );

  const getDefault = useCallback(
    (key: string): string | undefined => {
      const d = data?.defaults?.[key];
      if (d === undefined) return undefined;
      return String(d);
    },
    [data?.defaults]
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

  const computedFrontendUrl =
    useAppUrlForFrontend && data ? normalizeAppUrl(getVar('APP_URL') || '') : '';

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

  const handleTestHealth = useCallback(async (appUrl: string) => {
    const validation = validateEnvValue('APP_URL', appUrl);
    if (!validation.success) {
      setTestHealthStatus('error');
      setTestHealthMessage(validation.error);
      return;
    }
    if (!appUrl.trim()) {
      setTestHealthStatus('error');
      setTestHealthMessage('APP_URL is required');
      return;
    }
    setTestHealthStatus('loading');
    setTestHealthMessage('');
    try {
      const res = await fetch('/api/env/test-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appUrl: appUrl.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        setTestHealthStatus('success');
        setTestHealthMessage('Service is healthy');
      } else {
        setTestHealthStatus('error');
        setTestHealthMessage(json.error ?? 'Health check failed');
      }
    } catch (e) {
      setTestHealthStatus('error');
      setTestHealthMessage(e instanceof Error ? e.message : 'Request failed');
    }
  }, []);

  const handleTestRedis = useCallback(async (host: string, port?: string, password?: string) => {
    const hostTrim = host?.trim() ?? '';
    if (!hostTrim) {
      setTestRedisStatus('error');
      setTestRedisMessage('REDIS_HOST is required');
      return;
    }
    setTestRedisStatus('loading');
    setTestRedisMessage('');
    try {
      const res = await fetch('/api/env/test-redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: hostTrim,
          port: port?.trim() || undefined,
          password: password?.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setTestRedisStatus('success');
        setTestRedisMessage('Connection successful');
      } else {
        setTestRedisStatus('error');
        setTestRedisMessage(json.error ?? 'Connection failed');
      }
    } catch (e) {
      setTestRedisStatus('error');
      setTestRedisMessage(e instanceof Error ? e.message : 'Request failed');
    }
  }, []);

  const handleTestGithubOAuth = useCallback(async (clientId: string, clientSecret: string) => {
    const idTrim = clientId?.trim() ?? '';
    const secretTrim = clientSecret?.trim() ?? '';
    if (!idTrim || !secretTrim) {
      setTestGithubOAuthStatus('error');
      setTestGithubOAuthMessage('Client ID and Client Secret are required');
      return;
    }
    setTestGithubOAuthStatus('loading');
    setTestGithubOAuthMessage('');
    try {
      const res = await fetch('/api/env/test-github-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: idTrim, clientSecret: secretTrim }),
      });
      const json = await res.json();
      if (json.ok) {
        setTestGithubOAuthStatus('success');
        setTestGithubOAuthMessage('Credentials accepted by GitHub');
      } else {
        setTestGithubOAuthStatus('error');
        setTestGithubOAuthMessage(json.error ?? 'GitHub OAuth check failed');
      }
    } catch (e) {
      setTestGithubOAuthStatus('error');
      setTestGithubOAuthMessage(e instanceof Error ? e.message : 'Request failed');
    }
  }, []);

  const handleTestEmail = useCallback(
    async (toEmail: string, getEmailVars: () => Record<string, string>) => {
      const toTrim = toEmail?.trim() ?? '';
      if (!toTrim) {
        setTestEmailStatus('error');
        setTestEmailMessage('Recipient email is required');
        return;
      }
      const provider = getEmailVars().EMAIL_PROVIDER?.trim() ?? '';
      if (provider === 'console') {
        setTestEmailStatus('error');
        setTestEmailMessage('Select a real provider (mailgun, mailjet, ses, smtp) to send a test');
        return;
      }
      setTestEmailStatus('loading');
      setTestEmailMessage('');
      try {
        const v = getEmailVars();
        const from = v.EMAIL_FROM?.trim() ?? '';
        const body: Record<string, unknown> = {
          to: toTrim,
          provider,
          from,
          fromName: v.EMAIL_FROM_NAME?.trim() || undefined,
        };
        if (provider === 'mailgun') {
          body.mailgun = {
            apiKey: v.MAILGUN_API_KEY?.trim() ?? '',
            domain: v.MAILGUN_DOMAIN?.trim() ?? '',
          };
        } else if (provider === 'mailjet') {
          body.mailjet = {
            apiKey: v.MAILJET_API_KEY?.trim() ?? '',
            secretKey: v.MAILJET_SECRET_KEY?.trim() ?? '',
          };
        } else if (provider === 'ses') {
          body.ses = {
            clientId: v.EMAIL_SES_CLIENT_ID?.trim() ?? '',
            clientSecret: v.EMAIL_SES_CLIENT_SECRET?.trim() ?? '',
            region: v.EMAIL_SES_REGION?.trim() ?? 'us-east-1',
          };
        } else if (provider === 'smtp') {
          body.smtp = {
            host: v.SMTP_HOST?.trim() ?? '',
            port: parseInt(v.SMTP_PORT?.trim() ?? '587', 10) || 587,
            secure: v.SMTP_SECURE?.trim() === 'true',
            user: v.SMTP_USER?.trim() ?? '',
            password: v.SMTP_PASSWORD?.trim() ?? '',
          };
        }
        const res = await fetch('/api/env/test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.ok) {
          setTestEmailStatus('success');
          setTestEmailMessage('Test email sent');
        } else {
          setTestEmailStatus('error');
          setTestEmailMessage(json.error ?? 'Failed to send test email');
        }
      } catch (e) {
        setTestEmailStatus('error');
        setTestEmailMessage(e instanceof Error ? e.message : 'Request failed');
      }
    },
    []
  );

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
            body: JSON.stringify({ key: 'DB_URL', value: url, environment: selectedEnvironment }),
          })
            .then((r) => r.json())
            .then((json) => json.ok && fetchEnv());
        }
      }
    },
    [data, getVar, fetchEnv, selectedEnvironment]
  );

  const handleUseAppUrlForFrontendChange = useCallback(
    (checked: boolean) => {
      setUseAppUrlForFrontend(checked);
      if (checked && data) {
        const url = normalizeAppUrl(getVar('APP_URL') || '');
        if (url) {
          fetch('/api/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'SECURITY_FRONTEND_URL',
              value: url,
              environment: selectedEnvironment,
            }),
          })
            .then((r) => r.json())
            .then((json) => json.ok && fetchEnv());
        }
      }
    },
    [data, getVar, fetchEnv, selectedEnvironment]
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
          body: JSON.stringify({ key, value, environment: selectedEnvironment }),
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
          if (useAppUrlForFrontend && value) {
            const resFrontend = await fetch('/api/env', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key: 'SECURITY_FRONTEND_URL',
                value,
                environment: selectedEnvironment,
              }),
            });
            const jsonFrontend = await resFrontend.json();
            if (jsonFrontend.ok) await fetchEnv();
          }
          const port = getPortFromAppUrl(value);
          const resPort = await fetch('/api/env', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'API_PORT',
              value: String(port),
              environment: selectedEnvironment,
            }),
          });
          const jsonPort = await resPort.json();
          if (jsonPort.ok) await fetchEnv();
        } else if (key === 'API_PORT') {
          const appUrl = getVar('APP_URL');
          const newAppUrl = setPortInAppUrl(appUrl, parseInt(value, 10));
          if (newAppUrl) {
            const resUrl = await fetch('/api/env', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key: 'APP_URL',
                value: newAppUrl,
                environment: selectedEnvironment,
              }),
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
              body: JSON.stringify({
                key: 'DB_URL',
                value: newDbUrl,
                environment: selectedEnvironment,
              }),
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
    [
      data,
      editing,
      useDockerDb,
      useAppUrlForFrontend,
      getVar,
      getMultiVar,
      fetchEnv,
      selectedEnvironment,
    ]
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
    selectedEnvironment,
    activeTab,
    setActiveTab,
    editing,
    setEditing,
    saving,
    validationErrors,
    useDockerDb,
    useAppUrlForFrontend,
    handleUseAppUrlForFrontendChange,
    computedDbUrl,
    computedFrontendUrl,
    testDbStatus,
    testDbMessage,
    testHealthStatus,
    testHealthMessage,
    testRedisStatus,
    testRedisMessage,
    testGithubOAuthStatus,
    testGithubOAuthMessage,
    testEmailStatus,
    testEmailMessage,
    openSelectKey,
    setOpenSelectKey,
    getVar,
    getMultiVar,
    getDefault,
    onMultiVarChange,
    addMultiVarItem,
    removeMultiVarItem,
    handleReset,
    fetchEnv,
    handleGenerateSystemUserId,
    handleGeneratePassword,
    handleTestDbConnection,
    handleTestHealth,
    handleTestRedis,
    handleTestGithubOAuth,
    handleTestEmail,
    handleUseDockerDbChange,
    handleSave,
    handleBlur,
    isCategoryMisconfigured,
  };
}
