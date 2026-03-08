'use client';

import { useState, useCallback, useMemo } from 'react';
import type { EnvStateResponse, EnvVarValue } from '@/app/types/env';
import { CollapsibleSection } from './CollapsibleSection';
import { VarRow } from './VarRow';

export interface VarListProps {
  vars: EnvVarValue[];
  meta: EnvStateResponse['meta'];
  /** Section names to show collapsed by default (non-critical sections). When tab changes, parent should pass fresh set and use key so list remounts. */
  initialCollapsedSections?: Set<string>;
  editing: Record<string, string>;
  saving: string | null;
  validationErrors: Record<string, string>;
  useDockerDb: boolean;
  onUseDockerDbChange: (checked: boolean) => void;
  getVar: (key: string) => string;
  getMultiVar?: (key: string) => string[];
  onMultiVarChange?: (key: string, values: string[]) => void;
  addMultiVarItem?: (key: string) => void;
  removeMultiVarItem?: (key: string, index: number) => void;
  computedDbUrl: string;
  onEdit: (key: string, value: string) => void;
  onReset: (key: string) => void;
  onBlur: (key: string, value: string) => void;
  onSave: (key: string) => void;
  onTestDbUrl: (dbUrl: string) => void;
  testDbStatus: 'idle' | 'loading' | 'success' | 'error';
  testDbMessage: string;
  openSelectKey: string | null;
  onOpenSelectKeyChange: (key: string | null) => void;
  onGenerateSystemUserId: () => void;
  onGeneratePassword: (key: string) => void;
}

function normalizedMultiValue(value: string): string {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',');
}

/** Group vars by section (preserving order). Entries with the same section are consecutive. */
function groupVarsBySection(
  vars: EnvVarValue[],
  meta: EnvStateResponse['meta']
): { section: string | undefined; vars: EnvVarValue[] }[] {
  const groups: { section: string | undefined; vars: EnvVarValue[] }[] = [];
  let currentSection: string | undefined = undefined;
  let currentVars: EnvVarValue[] = [];

  for (const v of vars) {
    const m = meta.find((x) => x.key === v.key);
    const section = m?.section;
    if (section !== currentSection) {
      if (currentVars.length > 0) {
        groups.push({ section: currentSection, vars: currentVars });
      }
      currentSection = section;
      currentVars = [v];
    } else {
      currentVars.push(v);
    }
  }
  if (currentVars.length > 0) {
    groups.push({ section: currentSection, vars: currentVars });
  }
  return groups;
}

function isSectionCritical(
  group: { section: string | undefined; vars: EnvVarValue[] },
  meta: EnvStateResponse['meta']
): boolean {
  if (group.section === undefined) return true;
  return group.vars.some((v) => meta.find((m) => m.key === v.key)?.critical);
}

/** Section names that have no critical vars; these are collapsed by default and shown after critical sections. Exported for page to pass as initial state. */
export function getNonCriticalSectionNames(
  vars: EnvVarValue[],
  meta: EnvStateResponse['meta']
): Set<string> {
  const groups = groupVarsBySection(vars, meta);
  const nonCritical = new Set<string>();
  for (const g of groups) {
    if (g.section !== undefined && !isSectionCritical(g, meta)) {
      nonCritical.add(g.section);
    }
  }
  return nonCritical;
}

export function VarList({
  vars,
  meta,
  initialCollapsedSections,
  editing,
  saving,
  validationErrors,
  useDockerDb,
  onUseDockerDbChange,
  getVar,
  getMultiVar,
  onMultiVarChange,
  addMultiVarItem,
  removeMultiVarItem,
  computedDbUrl,
  onEdit,
  onReset,
  onBlur,
  onSave,
  onTestDbUrl,
  testDbStatus,
  testDbMessage,
  openSelectKey,
  onOpenSelectKeyChange,
  onGenerateSystemUserId,
  onGeneratePassword,
}: VarListProps) {
  const sortedGroups = useMemo(() => {
    const groups = groupVarsBySection(vars, meta);
    const withSortedVars = groups.map((g) => ({
      section: g.section,
      vars: [...g.vars].sort((a, b) => {
        const aCritical = meta.find((m) => m.key === a.key)?.critical ? 1 : 0;
        const bCritical = meta.find((m) => m.key === b.key)?.critical ? 1 : 0;
        return bCritical - aCritical;
      }),
    }));
    return withSortedVars.sort((a, b) => {
      const aCritical = isSectionCritical(a, meta);
      const bCritical = isSectionCritical(b, meta);
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;
      return 0;
    });
  }, [vars, meta]);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => initialCollapsedSections ?? new Set()
  );

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const renderVarRows = (groupVars: EnvVarValue[]) =>
    groupVars.map((v) => {
      const m = meta.find((x) => x.key === v.key);
      const isDbUrl = v.key === 'DB_URL';
      const boundToDocker = isDbUrl && useDockerDb;
      const isMulti = !!m?.multiValueSeparator;
      const currentValue = boundToDocker ? computedDbUrl : (editing[v.key] ?? v.value);
      const isDirty = !boundToDocker && (isMulti && getMultiVar
        ? normalizedMultiValue(getMultiVar(v.key).filter(Boolean).join(',')) !== normalizedMultiValue(v.value ?? '')
        : (editing[v.key] ?? v.value) !== v.value);
      const invalid = validationErrors[v.key];

      return (
        <VarRow
          key={v.key}
          var={v}
          meta={m}
          currentValue={currentValue}
          multiValues={isMulti && getMultiVar ? getMultiVar(v.key) : undefined}
          onMultiVarChange={onMultiVarChange}
          addMultiVarItem={addMultiVarItem}
          removeMultiVarItem={removeMultiVarItem}
          isDirty={isDirty}
          boundToDocker={boundToDocker}
          invalid={invalid}
          isSaving={saving === v.key}
          useDockerDb={useDockerDb}
          testDbStatus={testDbStatus}
          testDbMessage={testDbMessage}
          isSelectOpen={openSelectKey === v.key}
          onEdit={onEdit}
          onReset={onReset}
          onBlur={onBlur}
          onSave={onSave}
          onUseDockerDbChange={onUseDockerDbChange}
          onTestDbUrl={onTestDbUrl}
          onOpenSelectKeyChange={onOpenSelectKeyChange}
          onGenerateSystemUserId={onGenerateSystemUserId}
          onGeneratePassword={onGeneratePassword}
        />
      );
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {sortedGroups.map(({ section, vars: groupVars }) => (
        <div key={section ?? '_'} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {section !== undefined ? (
            <CollapsibleSection
              title={section}
              expanded={!collapsedSections.has(section)}
              onToggle={() => toggleSection(section)}
            >
              {renderVarRows(groupVars)}
            </CollapsibleSection>
          ) : (
            <>
              {renderVarRows(groupVars)}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
