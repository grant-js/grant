'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { CdmExportSection, CdmModeInput } from '@grantjs/schema';
import { CDM_EXPORT_SECTIONS, CdmModeStrategy, CdmOnConflict } from '@grantjs/schema';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  CopyCheck,
  Group,
  KeyRound,
  Loader2,
  Package,
  Shield,
  Tag,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { FieldInfoPopover } from '@/components/common';
import { useRuntimeConfig } from '@/components/providers/runtime-config-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useScopeFromParams } from '@/hooks/common';
import { useStartProjectExport } from '@/hooks/projects';
import { getDocsUrl } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';

type ExportDialogTab = 'contents' | 'options';

const ON_CONFLICT_DEFAULT = '__default__';
const CDM_EXPORT_VERSIONS = [1] as const;

/** Built per render, not at module load, so a `DOCS_URL` that arrives with `/api/config` applies. */
function buildExportDocs(docsUrl: string | null) {
  const base = `${getDocsUrl(docsUrl)}/core-concepts/cdm-import-export`;
  return {
    contents: `${base}#export-dialog-contents`,
    reimportDefaults: `${base}#export-reimport-defaults`,
    version: `${base}#export-cdm-version`,
    mode: `${base}#export-reimport-mode`,
    onConflict: `${base}#export-on-conflict`,
    confirmDestructive: `${base}#export-confirm-destructive`,
  } as const;
}

function buildSections(params: {
  resources: boolean;
  permissions: boolean;
  groups: boolean;
  tags: boolean;
  roles: boolean;
  users: boolean;
}): readonly CdmExportSection[] | undefined {
  const selected: CdmExportSection[] = [];
  if (params.resources) selected.push('resources');
  if (params.permissions) selected.push('permissions');
  if (params.groups) selected.push('groups');
  if (params.tags) selected.push('tags');
  if (params.roles) selected.push('roles');
  if (params.users) selected.push('users');
  if (
    selected.length === CDM_EXPORT_SECTIONS.length &&
    CDM_EXPORT_SECTIONS.every((s) => selected.includes(s))
  ) {
    return undefined;
  }
  return selected;
}

function buildExportMode(params: {
  strategy: CdmModeStrategy;
  onConflict: CdmOnConflict | null;
  confirmDestructive: boolean;
}): CdmModeInput {
  return {
    strategy: params.strategy,
    ...(params.onConflict != null ? { onConflict: params.onConflict } : {}),
    ...(params.confirmDestructive ? { confirmDestructive: true } : {}),
  };
}

function FieldLabelWithInfo({
  htmlFor,
  children,
  description,
  docsHref,
  docsAria,
  readMoreLabel,
}: {
  htmlFor?: string;
  children: ReactNode;
  description: string;
  docsHref: string;
  docsAria: string;
  readMoreLabel: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <Label htmlFor={htmlFor} className="truncate">
        {children}
      </Label>
      <FieldInfoPopover
        description={description}
        link={{ href: docsHref, label: readMoreLabel }}
        ariaLabel={docsAria}
        iconClassName="size-3.5"
      />
    </div>
  );
}

function CdmExportSectionRow({
  id,
  checked,
  disabled,
  onCheckedChange,
  icon: Icon,
  title,
  hint,
  nested = false,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
  icon: LucideIcon;
  title: ReactNode;
  hint: ReactNode;
  nested?: boolean;
}) {
  const row = (
    <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-1">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="col-start-1 row-start-1 self-center"
      />
      <Icon
        className="col-start-2 row-start-1 size-4 shrink-0 self-center text-muted-foreground"
        aria-hidden
      />
      <Label
        htmlFor={id}
        className="col-start-3 row-start-1 min-w-0 self-center font-normal cursor-pointer"
      >
        {title}
      </Label>
      <p className="col-start-3 row-start-2 min-w-0 text-xs leading-snug text-muted-foreground">
        {hint}
      </p>
    </div>
  );

  if (nested) {
    return <div className="border-l border-border pl-4">{row}</div>;
  }

  return row;
}

export function ProjectSyncJobExportDialog() {
  const t = useTranslations('projectSyncJobs.exportDialog');
  const tStart = useTranslations('projectSyncJobs.startDialog.summary');
  const tNotifications = useTranslations('projectSyncJobs.notifications');
  const scope = useScopeFromParams();
  const params = useParams();
  const projectId = params.projectId as string | undefined;

  const open = useProjectSyncJobsStore((s) => s.isExportDialogOpen);
  const setOpen = useProjectSyncJobsStore((s) => s.setExportDialogOpen);
  const prependJob = useProjectSyncJobsStore((s) => s.prependJob);
  const { docsUrl } = useRuntimeConfig();
  const exportDocs = useMemo(() => buildExportDocs(docsUrl), [docsUrl]);

  const [tab, setTab] = useState<ExportDialogTab>('contents');
  const [cdmVersion, setCdmVersion] = useState<(typeof CDM_EXPORT_VERSIONS)[number]>(1);
  const [jobName, setJobName] = useState('');
  const [strategy, setStrategy] = useState<CdmModeStrategy>(CdmModeStrategy.Merge);
  const [onConflict, setOnConflict] = useState<CdmOnConflict | null>(null);
  const [confirmDestructive, setConfirmDestructive] = useState(false);

  const [resources, setResources] = useState(true);
  const [permissions, setPermissions] = useState(true);
  const [groups, setGroups] = useState(true);
  const [tags, setTags] = useState(true);
  const [roles, setRoles] = useState(true);
  const [users, setUsers] = useState(true);
  const [includeUserApiKeys, setIncludeUserApiKeys] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const { startExport } = useStartProjectExport();

  useEffect(() => {
    if (open) {
      setTab('contents');
      setCdmVersion(1);
      setJobName('');
      setStrategy(CdmModeStrategy.Merge);
      setOnConflict(null);
      setConfirmDestructive(false);
      setResources(true);
      setPermissions(true);
      setGroups(true);
      setTags(true);
      setRoles(true);
      setUsers(true);
      setIncludeUserApiKeys(true);
      setSubmitting(false);
    }
  }, [open]);

  const onResourcesChecked = useCallback((checked: boolean) => {
    setResources(checked);
    if (!checked) {
      setPermissions(false);
    }
  }, []);

  const onPermissionsChecked = useCallback((checked: boolean) => {
    if (checked) {
      setResources(true);
    }
    setPermissions(checked);
  }, []);

  const onUsersChecked = useCallback((checked: boolean) => {
    setUsers(checked);
    if (!checked) {
      setIncludeUserApiKeys(true);
    }
  }, []);

  const onStrategyChange = useCallback((value: string) => {
    const next = value as CdmModeStrategy;
    setStrategy(next);
    if (next !== CdmModeStrategy.Replace) {
      setConfirmDestructive(false);
    }
  }, []);

  const showUsersWithoutRolesWarning = users && !roles;
  const nothingSelected = !resources && !permissions && !groups && !tags && !roles && !users;
  const exportDisabled = submitting || !projectId || !scope || nothingSelected;

  const tabs = useMemo(
    (): ReadonlyArray<{
      id: ExportDialogTab;
      label: string;
      infoDescription: string;
      infoDocsHref: string;
    }> => [
      {
        id: 'contents',
        label: t('tabs.contents'),
        infoDescription: t('contentsInfo'),
        infoDocsHref: exportDocs.contents,
      },
      {
        id: 'options',
        label: t('tabs.options'),
        infoDescription: t('options.reimportDefaultsInfo'),
        infoDocsHref: exportDocs.reimportDefaults,
      },
    ],
    [t, exportDocs]
  );

  const handleExport = useCallback(async () => {
    if (!projectId || !scope) return;
    if (strategy === CdmModeStrategy.Replace && !confirmDestructive) {
      setTab('options');
      toast.error(t('options.replaceRequiresConfirm'));
      return;
    }
    setSubmitting(true);
    try {
      const sections = buildSections({
        resources,
        permissions,
        groups,
        tags,
        roles,
        users,
      });
      const trimmedJobName = jobName.trim();
      const job = await startExport({
        id: projectId,
        scope,
        input: {
          version: cdmVersion,
          ...(trimmedJobName !== '' ? { jobName: trimmedJobName } : {}),
          sections: sections != null ? [...sections] : undefined,
          includeUserApiKeys: users && includeUserApiKeys === false ? false : undefined,
          mode: buildExportMode({ strategy, onConflict, confirmDestructive }),
        },
      });
      if (!job) {
        throw new Error('Export job was not created');
      }
      setOpen(false);
      toast.success(tNotifications('exportSuccess'));
      try {
        await useProjectSyncJobsStore.getState().refetch?.();
      } catch {
        // Best-effort; prepend below still surfaces the new row.
      }
      prependJob(job);
    } catch (err) {
      toast.error(tNotifications('exportError'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    cdmVersion,
    confirmDestructive,
    groups,
    includeUserApiKeys,
    jobName,
    onConflict,
    permissions,
    prependJob,
    projectId,
    resources,
    roles,
    scope,
    setOpen,
    startExport,
    strategy,
    t,
    tNotifications,
    tags,
    users,
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="border-b -mx-6 px-6">
          <div className="flex items-center gap-2">
            {tabs.map((entry) => {
              const active = entry.id === tab;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                    active
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={active}
                >
                  {entry.label}
                  <FieldInfoPopover
                    description={entry.infoDescription}
                    link={{ href: entry.infoDocsHref, label: t('readMore') }}
                    ariaLabel={t('readMoreAria')}
                    iconClassName="size-3.5"
                    stopPropagation
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto py-2">
          {tab === 'contents' ? (
            <div className="space-y-4">
              <CdmExportSectionRow
                id="cdm-export-users"
                checked={users}
                onCheckedChange={onUsersChecked}
                icon={Users}
                title={t('sections.users')}
                hint={t('sections.usersHint')}
              />

              <CdmExportSectionRow
                id="cdm-export-user-api-keys"
                checked={includeUserApiKeys}
                disabled={!users}
                onCheckedChange={setIncludeUserApiKeys}
                icon={KeyRound}
                title={t('sections.userApiKeys')}
                hint={t('sections.userApiKeysHint')}
                nested
              />

              <CdmExportSectionRow
                id="cdm-export-roles"
                checked={roles}
                onCheckedChange={setRoles}
                icon={Shield}
                title={t('sections.roles')}
                hint={t('sections.rolesHint')}
              />

              <CdmExportSectionRow
                id="cdm-export-groups"
                checked={groups}
                onCheckedChange={setGroups}
                icon={Group}
                title={t('sections.groups')}
                hint={t('sections.groupsHint')}
              />

              <CdmExportSectionRow
                id="cdm-export-resources"
                checked={resources}
                onCheckedChange={onResourcesChecked}
                icon={Package}
                title={t('sections.resources')}
                hint={t('sections.resourcesHint')}
              />

              <CdmExportSectionRow
                id="cdm-export-permissions"
                checked={permissions}
                disabled={!resources}
                onCheckedChange={onPermissionsChecked}
                icon={CopyCheck}
                title={t('sections.permissions')}
                hint={t('sections.permissionsHint')}
                nested
              />

              <CdmExportSectionRow
                id="cdm-export-tags"
                checked={tags}
                onCheckedChange={setTags}
                icon={Tag}
                title={t('sections.tags')}
                hint={t('sections.tagsHint')}
              />

              {showUsersWithoutRolesWarning ? (
                <Alert variant="warning" className="rounded-lg border-warning bg-warning/10">
                  <AlertCircle aria-hidden />
                  <AlertDescription className="text-xs">{t('helperReimport')}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cdm-export-job-name">{t('options.jobNameLabel')}</Label>
                <Input
                  id="cdm-export-job-name"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder={t('options.jobNameHint')}
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="min-w-0 space-y-2">
                  <FieldLabelWithInfo
                    htmlFor="cdm-export-version"
                    description={t('options.fieldInfo.version')}
                    docsHref={exportDocs.version}
                    docsAria={t('options.docsAria.version')}
                    readMoreLabel={t('readMore')}
                  >
                    {tStart('version')}
                  </FieldLabelWithInfo>
                  <Select
                    value={String(cdmVersion)}
                    onValueChange={(value) =>
                      setCdmVersion(Number(value) as (typeof CDM_EXPORT_VERSIONS)[number])
                    }
                  >
                    <SelectTrigger id="cdm-export-version" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CDM_EXPORT_VERSIONS.map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          {t('options.versionOption', { version: v })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0 space-y-2">
                  <FieldLabelWithInfo
                    htmlFor="cdm-export-strategy"
                    description={t('options.fieldInfo.mode')}
                    docsHref={exportDocs.mode}
                    docsAria={t('options.docsAria.mode')}
                    readMoreLabel={t('readMore')}
                  >
                    {tStart('strategyLabel')}
                  </FieldLabelWithInfo>
                  <Select value={strategy} onValueChange={onStrategyChange}>
                    <SelectTrigger id="cdm-export-strategy" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CdmModeStrategy.Merge}>
                        {tStart('strategy.merge')}
                      </SelectItem>
                      <SelectItem value={CdmModeStrategy.Replace}>
                        {tStart('strategy.replace')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0 space-y-2">
                  <FieldLabelWithInfo
                    htmlFor="cdm-export-on-conflict"
                    description={t('options.fieldInfo.onConflict')}
                    docsHref={exportDocs.onConflict}
                    docsAria={t('options.docsAria.onConflict')}
                    readMoreLabel={t('readMore')}
                  >
                    {tStart('onConflictLabel')}
                  </FieldLabelWithInfo>
                  <Select
                    value={onConflict ?? ON_CONFLICT_DEFAULT}
                    onValueChange={(value) =>
                      setOnConflict(value === ON_CONFLICT_DEFAULT ? null : (value as CdmOnConflict))
                    }
                  >
                    <SelectTrigger id="cdm-export-on-conflict" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ON_CONFLICT_DEFAULT}>
                        {t('options.onConflictDefault')}
                      </SelectItem>
                      <SelectItem value={CdmOnConflict.Fail}>
                        {tStart('onConflict.fail')}
                      </SelectItem>
                      <SelectItem value={CdmOnConflict.Skip}>
                        {tStart('onConflict.skip')}
                      </SelectItem>
                      <SelectItem value={CdmOnConflict.Update}>
                        {tStart('onConflict.update')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {strategy === CdmModeStrategy.Replace ? (
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <Checkbox
                    id="cdm-export-confirm-destructive"
                    checked={confirmDestructive}
                    onCheckedChange={(v) => setConfirmDestructive(v === true)}
                    className="col-start-1 row-start-1 self-center"
                  />
                  <div className="col-start-2 row-start-1 min-w-0 self-center">
                    <FieldLabelWithInfo
                      htmlFor="cdm-export-confirm-destructive"
                      description={t('options.confirmDestructiveHint')}
                      docsHref={exportDocs.confirmDestructive}
                      docsAria={t('options.docsAria.confirmDestructive')}
                      readMoreLabel={t('readMore')}
                    >
                      {tStart('confirmDestructiveLabel')}
                    </FieldLabelWithInfo>
                  </div>
                  <p className="col-start-2 row-start-2 min-w-0 text-xs leading-snug text-muted-foreground">
                    {t('options.confirmDestructiveHint')}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            {t('cancel')}
          </Button>
          <Button type="button" onClick={() => void handleExport()} disabled={exportDisabled}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
                {t('submitting')}
              </>
            ) : (
              t('export')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
