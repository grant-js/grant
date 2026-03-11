'use client';

import { Suspense, useMemo, useState, useCallback, useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { ThemeToggle } from '@/app/theme-toggle';
import { ConfigPageHeader } from '@/components/ConfigPageHeader';
import { ConfigSidebar } from '@/components/ConfigSidebar';
import { HamburgerButton } from '@/components/HamburgerButton';
import { VarList, getNonCriticalSectionNames } from '@/components/VarList';
import { useEnvState } from '@/hooks/useEnvState';
import type { EnvCategoryId } from '@/lib/env-metadata';

function ConfigPageContent() {
  const {
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
    testHealthStatus,
    testHealthMessage,
    handleTestHealth,
    testRedisStatus,
    testRedisMessage,
    handleTestRedis,
    testGithubOAuthStatus,
    testGithubOAuthMessage,
    handleTestGithubOAuth,
    testEmailStatus,
    testEmailMessage,
    handleTestEmail,
    openSelectKey,
    setOpenSelectKey,
    getVar,
    getMultiVar,
    onMultiVarChange,
    addMultiVarItem,
    removeMultiVarItem,
    handleReset,
    computedDbUrl,
    handleGenerateSystemUserId,
    handleGeneratePassword,
    handleTestDbConnection,
    handleUseDockerDbChange,
    handleSave,
    handleBlur,
    isCategoryMisconfigured,
  } = useEnvState();

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (!urlTab || urlTab === activeTab) return;
    setActiveTab(urlTab as typeof activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const varsInTab = useMemo(() => {
    if (!data) return [];
    return data.vars.filter((v) => {
      const m = data.meta.find((x) => x.key === v.key);
      return m?.category === activeTab;
    });
  }, [data, activeTab]);

  const initialCollapsedSections = useMemo(
    () =>
      data && varsInTab.length > 0
        ? getNonCriticalSectionNames(varsInTab, data.meta)
        : new Set<string>(),
    [data, varsInTab]
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const getEmailVars = useCallback(
    () => ({
      EMAIL_PROVIDER: getVar('EMAIL_PROVIDER'),
      EMAIL_FROM: getVar('EMAIL_FROM'),
      EMAIL_FROM_NAME: getVar('EMAIL_FROM_NAME'),
      MAILGUN_API_KEY: getVar('MAILGUN_API_KEY'),
      MAILGUN_DOMAIN: getVar('MAILGUN_DOMAIN'),
      MAILJET_API_KEY: getVar('MAILJET_API_KEY'),
      MAILJET_SECRET_KEY: getVar('MAILJET_SECRET_KEY'),
      EMAIL_SES_CLIENT_ID: getVar('EMAIL_SES_CLIENT_ID'),
      EMAIL_SES_CLIENT_SECRET: getVar('EMAIL_SES_CLIENT_SECRET'),
      EMAIL_SES_REGION: getVar('EMAIL_SES_REGION'),
      SMTP_HOST: getVar('SMTP_HOST'),
      SMTP_PORT: getVar('SMTP_PORT'),
      SMTP_SECURE: getVar('SMTP_SECURE'),
      SMTP_USER: getVar('SMTP_USER'),
      SMTP_PASSWORD: getVar('SMTP_PASSWORD'),
    }),
    [getVar]
  );
  const handleTabChange = useCallback(
    (tab: EnvCategoryId) => {
      setActiveTab(tab);
      setSidebarOpen(false);
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      const query = params.toString();
      router.replace(query ? `?${query}` : '?', { scroll: false });
    },
    [setActiveTab, router]
  );

  return (
    <main>
      <div className="config-layout">
        <ConfigPageHeader
          leftSlot={
            <HamburgerButton expanded={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />
          }
          rightSlot={<ThemeToggle />}
        />

        <div className="config-body">
          <div
            className={`config-sidebar-wrap ${sidebarOpen ? 'is-open' : ''}`}
            aria-hidden={!sidebarOpen}
          >
            <div
              className="config-sidebar-backdrop"
              aria-hidden="true"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="config-sidebar-drawer">
              <ConfigSidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isCategoryMisconfigured={isCategoryMisconfigured}
              />
            </div>
          </div>

          <div className="config-content">
            {loading && !data ? (
              <p className="config-body-message">Loading environment configuration…</p>
            ) : error && !data ? (
              <p className="config-body-message" style={{ color: 'var(--color-error)' }}>
                {error}
              </p>
            ) : !data ? (
              <p className="config-body-message">No configuration data.</p>
            ) : (
              <section className="section">
                <div className="card">
                  {varsInTab.length === 0 ? (
                    <p className="section-desc" style={{ margin: 0 }}>
                      No variables in this category.
                    </p>
                  ) : (
                    <VarList
                      key={activeTab}
                      vars={varsInTab}
                      meta={data.meta}
                      initialCollapsedSections={initialCollapsedSections}
                      editing={editing}
                      saving={saving}
                      validationErrors={validationErrors}
                      useDockerDb={useDockerDb}
                      onUseDockerDbChange={handleUseDockerDbChange}
                      getVar={getVar}
                      getMultiVar={getMultiVar}
                      onMultiVarChange={onMultiVarChange}
                      addMultiVarItem={addMultiVarItem}
                      removeMultiVarItem={removeMultiVarItem}
                      computedDbUrl={computedDbUrl}
                      onEdit={(key, value) => setEditing((prev) => ({ ...prev, [key]: value }))}
                      onReset={handleReset}
                      onBlur={handleBlur}
                      onSave={handleSave}
                      onTestDbUrl={handleTestDbConnection}
                      testDbStatus={testDbStatus}
                      testDbMessage={testDbMessage}
                      onTestHealth={handleTestHealth}
                      testHealthStatus={testHealthStatus}
                      testHealthMessage={testHealthMessage}
                      onTestRedis={() =>
                        handleTestRedis(
                          getVar('REDIS_HOST'),
                          getVar('REDIS_PORT'),
                          getVar('REDIS_PASSWORD')
                        )
                      }
                      testRedisStatus={testRedisStatus}
                      testRedisMessage={testRedisMessage}
                      onTestGithubOAuth={() =>
                        handleTestGithubOAuth(
                          getVar('GITHUB_CLIENT_ID'),
                          getVar('GITHUB_CLIENT_SECRET')
                        )
                      }
                      testGithubOAuthStatus={testGithubOAuthStatus}
                      testGithubOAuthMessage={testGithubOAuthMessage}
                      onTestEmail={(to) => handleTestEmail(to, getEmailVars)}
                      testEmailStatus={testEmailStatus}
                      testEmailMessage={testEmailMessage}
                      openSelectKey={openSelectKey}
                      onOpenSelectKeyChange={setOpenSelectKey}
                      onGenerateSystemUserId={handleGenerateSystemUserId}
                      onGeneratePassword={handleGeneratePassword}
                    />
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ConfigPage() {
  return (
    <Suspense
      fallback={
        <main>
          <p className="config-body-message">Loading…</p>
        </main>
      }
    >
      <ConfigPageContent />
    </Suspense>
  );
}
