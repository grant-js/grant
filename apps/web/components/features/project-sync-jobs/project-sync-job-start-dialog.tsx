'use client';

import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { type CdmModeInput, CdmModeStrategy, CdmOnConflict } from '@grantjs/schema';
import { AlertCircle, FileJson, Loader2, ShieldAlert, X } from 'lucide-react';
import { type FileRejection, useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

import { JsonFileDropzone, type JsonFileDropzoneProps } from '@/components/common';
import { useRuntimeConfig } from '@/components/providers/runtime-config-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useDirectUploadMessage, useScopeFromParams } from '@/hooks/common';
import { useImportProjectSyncByReference } from '@/hooks/projects';
import {
  CDM_BROWSER_PARSE_MAX_BYTES,
  type CdmPayloadShape,
  countCdmEntities,
  formatMebibytes,
  isCdmPayloadShape,
  readPayloadTooLarge,
} from '@/lib/cdm-import';
import { DirectUploadError } from '@/lib/direct-upload';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';

const ACCEPT_JSON = {
  'application/json': ['.json'],
  'text/json': ['.json'],
} as const;

interface SelectedFile {
  file: File;
  /**
   * The document, when the file is small enough to parse in the browser
   * (`CDM_BROWSER_PARSE_MAX_BYTES`). `null` above that: the file goes up unparsed and the
   * worker is the only validator.
   */
  document: CdmPayloadShape | null;
}

function generateImportId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ProjectSyncJobStartDialog() {
  const t = useTranslations('projectSyncJobs.startDialog');
  const tNotifications = useTranslations('projectSyncJobs.notifications');
  const scope = useScopeFromParams();
  const params = useParams();
  const projectId = params.projectId as string;

  const projectGrantContext = useMemo(
    () =>
      projectId ? { resource: { id: projectId, scope: { projects: [projectId] } } } : undefined,
    [projectId]
  );

  const isOpen = useProjectSyncJobsStore((state) => state.isStartDialogOpen);
  const setOpen = useProjectSyncJobsStore((state) => state.setStartDialogOpen);
  const prependJob = useProjectSyncJobsStore((state) => state.prependJob);

  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Only used for a file too large to parse, where the document's own `mode` is unknown
  // to the browser and the request needs one. `null` until the user chooses.
  const [chosenStrategy, setChosenStrategy] = useState<CdmModeStrategy | null>(null);
  const [chosenConfirmDestructive, setChosenConfirmDestructive] = useState(false);

  const { cdmUploadMaxBytes } = useRuntimeConfig();
  const maxFileSizeLabel = formatMebibytes(cdmUploadMaxBytes);
  const directUploadMessage = useDirectUploadMessage();
  const { importByReference } = useImportProjectSyncByReference();
  const { isGranted: canStart, isLoading: grantLoading } = useGrant(
    ResourceSlug.ProjectSyncJob,
    ResourceAction.Update,
    { scope, context: projectGrantContext, returnLoading: true }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const reset = useCallback(() => {
    setSelected(null);
    setParseError(null);
    setSubmitting(false);
    setChosenStrategy(null);
    setChosenConfirmDestructive(false);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejected: FileRejection[]) => {
      setParseError(null);
      if (rejected.length > 0) {
        const first = rejected[0]?.errors?.[0]?.code ?? '';
        if (first === 'file-too-large') {
          setParseError(t('errors.fileTooLarge', { maxSize: maxFileSizeLabel }));
        } else if (first === 'file-invalid-type') {
          setParseError(t('errors.invalidType'));
        } else {
          setParseError(t('errors.readFailed'));
        }
        return;
      }
      const file = acceptedFiles[0];
      if (!file) return;

      setChosenStrategy(null);
      setChosenConfirmDestructive(false);

      // Parsing is a preview and a source for the job name and the `entityCount` hint,
      // worth doing only while it is cheap. Above the threshold the file is sent as it
      // is and the worker validates it.
      if (file.size > CDM_BROWSER_PARSE_MAX_BYTES) {
        setSelected({ file, document: null });
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => setParseError(t('errors.readFailed'));
      reader.onload = () => {
        try {
          const text = String(reader.result ?? '');
          const json = JSON.parse(text);
          if (!isCdmPayloadShape(json)) {
            setParseError(t('errors.invalidShape'));
            return;
          }
          setSelected({ file, document: json });
        } catch {
          setParseError(t('errors.invalidJson'));
        }
      };
      reader.readAsText(file);
    },
    [t, maxFileSizeLabel]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT_JSON as unknown as Record<string, string[]>,
    maxFiles: 1,
    maxSize: cdmUploadMaxBytes,
    multiple: false,
    noClick: !!selected,
    noKeyboard: !!selected,
    disabled: grantLoading || !canStart || requiresEmailVerification,
  });

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (submitting) return;
      setOpen(open);
      if (!open) reset();
    },
    [submitting, setOpen, reset]
  );

  const cdmDocument = selected?.document ?? null;

  const stats = useMemo(() => {
    if (!cdmDocument) return null;
    const apiKeyCount = (cdmDocument.users as Array<{ apiKeys?: unknown[] }>).reduce(
      (n, u) => n + (Array.isArray(u?.apiKeys) ? u.apiKeys.length : 0),
      0
    );
    const jobName =
      typeof cdmDocument.id === 'string' && cdmDocument.id.trim() !== ''
        ? cdmDocument.id.trim()
        : null;
    const strategy = cdmDocument.mode.strategy;
    const onConflict = cdmDocument.mode.onConflict ?? null;
    const confirmDestructive = Boolean(cdmDocument.mode.confirmDestructive);
    return {
      version: cdmDocument.version,
      strategy,
      onConflict,
      confirmDestructive,
      jobName,
      roles: cdmDocument.roles.length,
      users: cdmDocument.users.length,
      apiKeys: apiKeyCount,
      groups: cdmDocument.groups?.length ?? 0,
      resources: cdmDocument.resources?.length ?? 0,
      permissions: cdmDocument.permissions?.length ?? 0,
      tags: cdmDocument.tags?.length ?? 0,
    };
  }, [cdmDocument]);

  const strategyLabel = useMemo(() => {
    if (!stats?.strategy) return null;
    if (stats.strategy === CdmModeStrategy.Merge) return t('summary.strategy.merge');
    if (stats.strategy === CdmModeStrategy.Replace) return t('summary.strategy.replace');
    return String(stats.strategy);
  }, [stats?.strategy, t]);

  const onConflictLabel = useMemo(() => {
    if (!stats?.onConflict) return null;
    if (stats.onConflict === CdmOnConflict.Fail) return t('summary.onConflict.fail');
    if (stats.onConflict === CdmOnConflict.Skip) return t('summary.onConflict.skip');
    if (stats.onConflict === CdmOnConflict.Update) return t('summary.onConflict.update');
    return String(stats.onConflict);
  }, [stats?.onConflict, t]);

  // A parsed file brings its own mode. An unparsed one needs the user's choice, and for
  // `replace` the same explicit confirmation the server requires on the request.
  const unparsedModeIncomplete =
    selected !== null &&
    selected.document === null &&
    (chosenStrategy === null ||
      (chosenStrategy === CdmModeStrategy.Replace && !chosenConfirmDestructive));

  const handleSubmit = useCallback(async () => {
    if (!selected || !scope) return;
    setSubmitting(true);
    try {
      const { file, document: parsedDocument } = selected;

      let mode: CdmModeInput;
      let jobName: string;
      let version: number | undefined;
      let entityCount: number | undefined;
      if (parsedDocument) {
        mode = { ...parsedDocument.mode } as CdmModeInput;
        jobName =
          typeof parsedDocument.id === 'string' && parsedDocument.id.trim() !== ''
            ? parsedDocument.id.trim()
            : generateImportId();
        version = parsedDocument.version;
        entityCount = countCdmEntities(parsedDocument);
      } else {
        if (!chosenStrategy) return;
        mode = {
          strategy: chosenStrategy,
          ...(chosenStrategy === CdmModeStrategy.Replace ? { confirmDestructive: true } : {}),
        };
        jobName = generateImportId();
      }

      const job = await importByReference({
        id: projectId,
        scope,
        file,
        jobName,
        mode,
        version,
        entityCount,
      });
      setOpen(false);
      reset();
      toast.success(tNotifications('startSuccess'));
      if (job) {
        try {
          await useProjectSyncJobsStore.getState().refetch?.();
        } catch {
          // Best-effort; prepend below still surfaces the new row.
        }
        prependJob(job);
      }
    } catch (error) {
      const tooLarge = readPayloadTooLarge(error);
      if (tooLarge) {
        // The API refused the size (at the upload URL or at the start). Say so, with the
        // limit it reported, instead of the generic failure.
        toast.error(
          t('errors.fileTooLarge', {
            maxSize: formatMebibytes(tooLarge.limitBytes ?? cdmUploadMaxBytes),
          })
        );
      } else {
        toast.error(tNotifications('startError'), {
          description:
            error instanceof DirectUploadError
              ? directUploadMessage(error)
              : error instanceof Error
                ? error.message
                : undefined,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    selected,
    scope,
    chosenStrategy,
    projectId,
    importByReference,
    prependJob,
    tNotifications,
    setOpen,
    reset,
    t,
    cdmUploadMaxBytes,
    directUploadMessage,
  ]);

  if (!scope) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="min-w-0 overflow-x-hidden sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {grantLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">{t('checkingPermission')}</p>
          </div>
        ) : requiresEmailVerification ? (
          <Alert variant="warning">
            <AlertCircle className="size-4" />
            <AlertTitle>{t('emailVerificationTitle')}</AlertTitle>
            <AlertDescription>{t('emailVerificationDescription')}</AlertDescription>
          </Alert>
        ) : !canStart ? (
          <Alert variant="destructive">
            <ShieldAlert className="size-4" />
            <AlertTitle>{t('permissionDeniedTitle')}</AlertTitle>
            <AlertDescription>{t('permissionDeniedDescription')}</AlertDescription>
          </Alert>
        ) : !selected ? (
          <JsonFileDropzone
            getRootProps={getRootProps as JsonFileDropzoneProps['getRootProps']}
            getInputProps={getInputProps as JsonFileDropzoneProps['getInputProps']}
            isDragActive={isDragActive}
            activeLabel={t('dropzone.active')}
            idleLabel={t('dropzone.idle')}
            hint={t('dropzone.hint', { maxSize: maxFileSizeLabel })}
            browseLabel={t('dropzone.browse')}
            error={parseError}
          />
        ) : (
          <div className="min-w-0 max-w-full space-y-4">
            <div className="flex w-full min-w-0 max-w-full items-start gap-3 rounded-lg border p-4">
              <div className="flex min-w-0 flex-1 items-start gap-3 overflow-hidden">
                <FileJson className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p
                    className="block min-w-0 truncate text-sm font-medium"
                    title={selected.file.name}
                  >
                    {selected.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatBytes(selected.file.size)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={reset}
                aria-label={t('clear')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!selected.document && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('largeFile.note', { threshold: formatMebibytes(CDM_BROWSER_PARSE_MAX_BYTES) })}
                </p>
                <div className="space-y-2">
                  <Label id="cdm-import-strategy-label">{t('summary.strategyLabel')}</Label>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    aria-labelledby="cdm-import-strategy-label"
                    value={chosenStrategy ?? ''}
                    onValueChange={(value) => {
                      setChosenStrategy(value ? (value as CdmModeStrategy) : null);
                      setChosenConfirmDestructive(false);
                    }}
                    className="justify-start"
                  >
                    <ToggleGroupItem value={CdmModeStrategy.Merge}>
                      {t('summary.strategy.merge')}
                    </ToggleGroupItem>
                    <ToggleGroupItem value={CdmModeStrategy.Replace}>
                      {t('summary.strategy.replace')}
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <p className="text-xs text-muted-foreground">{t('largeFile.modeHint')}</p>
                </div>
                {chosenStrategy === CdmModeStrategy.Replace ? (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="cdm-import-confirm-destructive"
                      checked={chosenConfirmDestructive}
                      onCheckedChange={(value) => setChosenConfirmDestructive(value === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="cdm-import-confirm-destructive" className="leading-snug">
                      {t('largeFile.confirmDestructive')}
                    </Label>
                  </div>
                ) : null}
              </div>
            )}

            {stats && (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('summary.jobParameters')}
                  </p>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                    <div className="min-w-0 sm:col-span-1">
                      <dt className="text-xs text-muted-foreground">{t('summary.version')}</dt>
                      <dd className="font-medium tabular-nums">v{stats.version}</dd>
                    </div>
                    <div className="min-w-0 sm:col-span-1">
                      <dt className="text-xs text-muted-foreground">
                        {t('summary.strategyLabel')}
                      </dt>
                      <dd className="font-medium">{strategyLabel ?? '—'}</dd>
                    </div>
                    {onConflictLabel ? (
                      <div className="min-w-0 sm:col-span-1">
                        <dt className="text-xs text-muted-foreground">
                          {t('summary.onConflictLabel')}
                        </dt>
                        <dd className="font-medium">{onConflictLabel}</dd>
                      </div>
                    ) : null}
                    {stats.confirmDestructive ? (
                      <div className="min-w-0 sm:col-span-1">
                        <dt className="text-xs text-muted-foreground">
                          {t('summary.confirmDestructiveLabel')}
                        </dt>
                        <dd className="font-medium">{t('summary.confirmDestructiveYes')}</dd>
                      </div>
                    ) : null}
                    {stats.jobName ? (
                      <div className="min-w-0 sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">{t('summary.jobName')}</dt>
                        <dd className="break-all font-mono text-xs font-medium">{stats.jobName}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('summary.entityCounts')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                    <div className="rounded-md bg-muted p-2.5 sm:p-3">
                      <p className="text-xs text-muted-foreground">{t('summary.roles')}</p>
                      <p className="text-lg font-semibold tabular-nums">{stats.roles}</p>
                    </div>
                    <div className="rounded-md bg-muted p-2.5 sm:p-3">
                      <p className="text-xs text-muted-foreground">{t('summary.users')}</p>
                      <p className="text-lg font-semibold tabular-nums">{stats.users}</p>
                    </div>
                    <div className="rounded-md bg-muted p-2.5 sm:p-3">
                      <p className="text-xs text-muted-foreground">{t('summary.apiKeys')}</p>
                      <p className="text-lg font-semibold tabular-nums">{stats.apiKeys}</p>
                    </div>
                    <div className="rounded-md bg-muted p-2.5 sm:p-3">
                      <p className="text-xs text-muted-foreground">{t('summary.groups')}</p>
                      <p className="text-lg font-semibold tabular-nums">{stats.groups}</p>
                    </div>
                    <div className="rounded-md bg-muted p-2.5 sm:p-3">
                      <p className="text-xs text-muted-foreground">{t('summary.resources')}</p>
                      <p className="text-lg font-semibold tabular-nums">{stats.resources}</p>
                    </div>
                    <div className="rounded-md bg-muted p-2.5 sm:p-3">
                      <p className="text-xs text-muted-foreground">{t('summary.permissions')}</p>
                      <p className="text-lg font-semibold tabular-nums">{stats.permissions}</p>
                    </div>
                    <div className="rounded-md bg-muted p-2.5 sm:p-3">
                      <p className="text-xs text-muted-foreground">{t('summary.tags')}</p>
                      <p className="text-lg font-semibold tabular-nums">{stats.tags}</p>
                    </div>
                  </div>
                </div>

                {stats.apiKeys > 0 ? (
                  <p className="text-xs text-muted-foreground">{t('summary.byokNote')}</p>
                ) : null}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !selected ||
              unparsedModeIncomplete ||
              submitting ||
              !canStart ||
              requiresEmailVerification ||
              grantLoading
            }
          >
            {submitting ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
