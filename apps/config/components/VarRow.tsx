'use client';

import { Check, ChevronDown, Heart, Plus, RefreshCw, X, Zap } from 'lucide-react';

import type { EnvVarValue } from '@/app/types/env';
import type { EnvVarMeta } from '@/lib/env-metadata';
import { envKeyToTitleCase } from '@/lib/format-env-key';

export interface VarRowProps {
  var: EnvVarValue;
  meta: EnvVarMeta | undefined;
  currentValue: string;
  multiValues?: string[];
  onMultiVarChange?: (key: string, values: string[]) => void;
  addMultiVarItem?: (key: string) => void;
  removeMultiVarItem?: (key: string, index: number) => void;
  isDirty: boolean;
  boundToDocker: boolean;
  invalid: string | undefined;
  isSaving: boolean;
  useDockerDb: boolean;
  testDbStatus: 'idle' | 'loading' | 'success' | 'error';
  testDbMessage: string;
  testHealthStatus: 'idle' | 'loading' | 'success' | 'error';
  testHealthMessage: string;
  testRedisStatus: 'idle' | 'loading' | 'success' | 'error';
  testRedisMessage: string;
  onTestRedis: () => void;
  testGithubOAuthStatus: 'idle' | 'loading' | 'success' | 'error';
  testGithubOAuthMessage: string;
  onTestGithubOAuth: () => void;
  isSelectOpen: boolean;
  onEdit: (key: string, value: string) => void;
  onReset: (key: string) => void;
  onBlur: (key: string, value: string) => void;
  onSave: (key: string) => void;
  onUseDockerDbChange: (checked: boolean) => void;
  onTestDbUrl: (dbUrl: string) => void;
  onTestHealth: (appUrl: string) => void;
  onOpenSelectKeyChange: (key: string | null) => void;
  onGenerateSystemUserId: () => void;
  onGeneratePassword: (key: string) => void;
}

export function VarRow({
  var: v,
  meta: m,
  currentValue,
  multiValues,
  onMultiVarChange,
  addMultiVarItem,
  removeMultiVarItem,
  isDirty,
  boundToDocker,
  invalid,
  isSaving,
  useDockerDb,
  testDbStatus,
  testDbMessage,
  testHealthStatus,
  testHealthMessage,
  testRedisStatus,
  testRedisMessage,
  onTestRedis,
  testGithubOAuthStatus,
  testGithubOAuthMessage,
  onTestGithubOAuth,
  isSelectOpen,
  onEdit,
  onReset,
  onBlur,
  onSave,
  onUseDockerDbChange,
  onTestDbUrl,
  onTestHealth,
  onOpenSelectKeyChange,
  onGenerateSystemUserId,
  onGeneratePassword,
}: VarRowProps) {
  const isDbUrl = v.key === 'DB_URL';
  const isAppUrl = v.key === 'APP_URL';
  const isRedisHost = v.key === 'REDIS_HOST';
  const isGithubClientSecret = v.key === 'GITHUB_CLIENT_SECRET';
  const isSystemUserId = v.key === 'SYSTEM_USER_ID';
  const statusSet =
    v.status === 'set' ||
    (boundToDocker && currentValue?.trim()) ||
    (multiValues !== undefined && multiValues.some((s) => s.trim() !== ''));
  const statusMissing = v.status === 'missing';
  const badgeClass = statusSet ? 'badge-success' : statusMissing ? 'badge-error' : 'badge-muted';
  const badgeLabel = statusSet ? 'Set' : statusMissing ? 'Missing' : 'Empty';

  return (
    <div className="var-row">
      <div>
        <div className="var-name-row">
          <span className="var-name" title={v.key}>
            {envKeyToTitleCase(v.key)}
          </span>
          <span className={`badge var-badge ${badgeClass}`}>{badgeLabel}</span>
        </div>
        {m?.description && (
          <div className="depends-on" title="Description">
            {m.description}
          </div>
        )}
        {boundToDocker && (
          <div className="depends-on">
            Derived from <code>POSTGRES_DB</code>, <code>POSTGRES_USER</code>,{' '}
            <code>POSTGRES_PASSWORD</code> (Docker). Edit those to change.
          </div>
        )}
        {m?.dependsOn && !boundToDocker && (
          <div className="depends-on">
            Depends on <code>{m.dependsOn.key}</code> = {m.dependsOn.values.join(' | ')}
          </div>
        )}
      </div>
      <div className="input-cell">
        <div className="input-wrapper">
          {multiValues !== undefined &&
          onMultiVarChange &&
          addMultiVarItem &&
          removeMultiVarItem ? (
            <div className="multi-value-inputs">
              {multiValues.map((item, index) => (
                <div key={index} className="multi-value-row">
                  <input
                    type="text"
                    className={`input multi-value-input ${invalid ? 'input-invalid' : ''}`}
                    value={item}
                    onChange={(e) => {
                      const next = [...multiValues];
                      next[index] = e.target.value;
                      onMultiVarChange(v.key, next);
                    }}
                    onBlur={() => onBlur(v.key, multiValues.filter(Boolean).join(','))}
                    placeholder="Origin URL"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      flex: 1,
                      minWidth: 0,
                    }}
                  />
                  <button
                    type="button"
                    className="multi-value-remove"
                    onClick={() => removeMultiVarItem(v.key, index)}
                    aria-label={`Remove origin ${index + 1}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="multi-value-actions">
                <button
                  type="button"
                  className="test-db-btn"
                  onClick={() => addMultiVarItem(v.key)}
                >
                  <Plus size={14} className="test-db-btn-icon" />
                  Add origin
                </button>
                {isDirty && (
                  <div className="multi-value-save-actions">
                    <button
                      type="button"
                      className="input-action-btn input-action-confirm"
                      disabled={isSaving || !!invalid}
                      onClick={() => onSave(v.key)}
                      aria-label="Save"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="input-action-btn input-action-reset"
                      onClick={() => onReset(v.key)}
                      aria-label="Reset"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : m?.options ? (
            <div
              className={`custom-select ${isSelectOpen ? 'custom-select-open' : ''} ${isDirty ? 'custom-select-dirty' : ''} ${invalid ? 'input-invalid' : ''} ${m.dropdownPosition === 'above' ? 'custom-select-dropdown-above' : ''}`}
              data-custom-select={v.key}
            >
              <button
                type="button"
                className="custom-select-trigger"
                disabled={boundToDocker}
                onClick={() => !boundToDocker && onOpenSelectKeyChange(isSelectOpen ? null : v.key)}
                onBlur={() => boundToDocker || onBlur(v.key, currentValue)}
              >
                <span className="custom-select-value">{currentValue || 'Not set'}</span>
                <ChevronDown size={16} className="custom-select-chevron" aria-hidden />
              </button>
              {isSelectOpen && (
                <div
                  className="custom-select-dropdown"
                  role="listbox"
                  aria-label={`Select ${v.key}`}
                >
                  {m.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      role="option"
                      className="custom-select-option"
                      aria-selected={currentValue === opt}
                      onClick={() => {
                        onEdit(v.key, opt);
                        onOpenSelectKeyChange(null);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              inputMode={m?.digitsOnly ? 'numeric' : undefined}
              pattern={m?.digitsOnly ? '[0-9]*' : undefined}
              className={`input ${invalid ? 'input-invalid' : ''}`}
              value={currentValue}
              onChange={(e) =>
                !boundToDocker &&
                onEdit(v.key, m?.digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value)
              }
              onBlur={() => !boundToDocker && onBlur(v.key, currentValue)}
              placeholder={v.source ? `From ${v.source}` : 'Not set'}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                paddingRight: isDirty ? '4.5rem' : undefined,
              }}
              readOnly={boundToDocker}
              disabled={boundToDocker}
            />
          )}
          {isDirty && multiValues === undefined && (
            <div className="input-actions">
              <button
                type="button"
                className="input-action-btn input-action-confirm"
                disabled={isSaving || !!invalid}
                onClick={() => onSave(v.key)}
                aria-label="Save"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                className="input-action-btn input-action-reset"
                onClick={() => onReset(v.key)}
                aria-label="Reset"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        {invalid && <div className="validation-error">{invalid}</div>}
        {isSystemUserId && (
          <div className="test-db-row">
            <button type="button" className="test-db-btn" onClick={onGenerateSystemUserId}>
              <RefreshCw size={14} className="test-db-btn-icon" />
              Generate UUID
            </button>
          </div>
        )}
        {m?.isPassword && (
          <div className="test-db-row">
            <button type="button" className="test-db-btn" onClick={() => onGeneratePassword(v.key)}>
              <RefreshCw size={14} className="test-db-btn-icon" />
              Generate password
            </button>
          </div>
        )}
        {isDbUrl && (
          <>
            <div className="db-url-actions-row">
              <label className="db-url-docker-toggle">
                <input
                  type="checkbox"
                  checked={useDockerDb}
                  onChange={(e) => onUseDockerDbChange(e.target.checked)}
                />
                <span>Use docker database</span>
              </label>
              <button
                type="button"
                className="test-db-btn"
                disabled={testDbStatus === 'loading' || !currentValue?.trim()}
                onClick={() => onTestDbUrl(currentValue ?? '')}
              >
                <Zap size={14} className="test-db-btn-icon" />
                {testDbStatus === 'loading' ? 'Testing…' : 'Test connection'}
              </button>
            </div>
            {(testDbStatus === 'success' || testDbStatus === 'error') && (
              <div className="test-db-msg-row">
                <span
                  className={
                    testDbStatus === 'success'
                      ? 'test-db-msg test-db-msg-success'
                      : 'test-db-msg test-db-msg-error'
                  }
                >
                  {testDbMessage}
                </span>
              </div>
            )}
          </>
        )}
        {isAppUrl && (
          <>
            <div className="test-db-row">
              <button
                type="button"
                className="test-db-btn"
                disabled={testHealthStatus === 'loading' || !currentValue?.trim()}
                onClick={() => onTestHealth(currentValue ?? '')}
              >
                <Heart size={14} className="test-db-btn-icon" />
                {testHealthStatus === 'loading' ? 'Testing…' : 'Check service'}
              </button>
            </div>
            {(testHealthStatus === 'success' || testHealthStatus === 'error') && (
              <div className="test-db-msg-row">
                <span
                  className={
                    testHealthStatus === 'success'
                      ? 'test-db-msg test-db-msg-success'
                      : 'test-db-msg test-db-msg-error'
                  }
                >
                  {testHealthMessage}
                </span>
              </div>
            )}
          </>
        )}
        {isRedisHost && (
          <>
            <div className="test-db-row">
              <button
                type="button"
                className="test-db-btn"
                disabled={testRedisStatus === 'loading' || !currentValue?.trim()}
                onClick={onTestRedis}
              >
                <Zap size={14} className="test-db-btn-icon" />
                {testRedisStatus === 'loading' ? 'Testing…' : 'Test connection'}
              </button>
            </div>
            {(testRedisStatus === 'success' || testRedisStatus === 'error') && (
              <div className="test-db-msg-row">
                <span
                  className={
                    testRedisStatus === 'success'
                      ? 'test-db-msg test-db-msg-success'
                      : 'test-db-msg test-db-msg-error'
                  }
                >
                  {testRedisMessage}
                </span>
              </div>
            )}
          </>
        )}
        {isGithubClientSecret && (
          <>
            <div className="test-db-row">
              <button
                type="button"
                className="test-db-btn"
                disabled={
                  testGithubOAuthStatus === 'loading' ||
                  !currentValue?.trim()
                }
                onClick={onTestGithubOAuth}
              >
                <Zap size={14} className="test-db-btn-icon" />
                {testGithubOAuthStatus === 'loading' ? 'Testing…' : 'Test connection'}
              </button>
            </div>
            {(testGithubOAuthStatus === 'success' || testGithubOAuthStatus === 'error') && (
              <div className="test-db-msg-row">
                <span
                  className={
                    testGithubOAuthStatus === 'success'
                      ? 'test-db-msg test-db-msg-success'
                      : 'test-db-msg test-db-msg-error'
                  }
                >
                  {testGithubOAuthMessage}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
