'use client';

import { useMemo, useState, useCallback } from 'react';
import { ThemeToggle } from '@/app/theme-toggle';
import { ConfigPageHeader } from '@/components/ConfigPageHeader';
import { ConfigSidebar } from '@/components/ConfigSidebar';
import { HamburgerButton } from '@/components/HamburgerButton';
import { VarList, getNonCriticalSectionNames } from '@/components/VarList';
import { useEnvState } from '@/hooks/useEnvState';

export default function ConfigPage() {
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

  const varsInTab = useMemo(() => {
    if (!data) return [];
    return data.vars.filter((v) => {
      const m = data.meta.find((x) => x.key === v.key);
      return m?.category === activeTab;
    });
  }, [data, activeTab]);

  const initialCollapsedSections = useMemo(
    () => (data && varsInTab.length > 0 ? getNonCriticalSectionNames(varsInTab, data.meta) : new Set<string>()),
    [data, varsInTab]
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleTabChange = useCallback(
    (tab: Parameters<typeof setActiveTab>[0]) => {
      setActiveTab(tab);
      setSidebarOpen(false);
    },
    [setActiveTab]
  );

  return (
    <main>
      <div className="config-layout">
        <ConfigPageHeader
          leftSlot={<HamburgerButton expanded={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />}
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
