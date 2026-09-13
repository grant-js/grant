'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Pencil } from 'lucide-react';

import { FeatureModuleCard } from '@/components/common';
import { SettingImageUploadDialog } from '@/components/features/settings';
import { FeatureDetailLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEmailVerified } from '@/hooks/auth';
import { useProjectScope, useScopeFromParams } from '@/hooks/common';
import { useProjectMutations, useProjects } from '@/hooks/projects';
import { GRANT_PRIMARY_COLOR } from '@/lib/oauth-branding';
import { useProjectsStore } from '@/stores/projects.store';

import { ProjectAvatar } from './project-avatar';

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function ProjectBrandingViewer() {
  const t = useTranslations('projects.branding');
  const tCommon = useTranslations('common');
  const params = useParams();
  const projectId = params.projectId as string;
  const parentScope = useProjectScope();
  const projectScope = useScopeFromParams();
  const isEmailVerified = useEmailVerified();

  const { projects, loading, refetch } = useProjects({
    scope: parentScope!,
    ids: [projectId],
    limit: 1,
    skip: !parentScope,
  });
  const project = projects[0];
  const { updateProject, uploadProjectPictureDirect, clearProjectPicture } = useProjectMutations();

  const canUpdate = useGrant(ResourceSlug.Project, ResourceAction.Update, {
    scope: parentScope!,
    context: project
      ? { resource: { id: project.id, scope: { projects: [project.id] } } }
      : undefined,
    enabled: !!parentScope && !!project,
  });

  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [showHelpPanel, setShowHelpPanel] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (!project || initialized) return;
    setPrimaryColor(project.primaryColor ?? null);
    setShowHelpPanel(project.showHelpPanel ?? true);
    setInitialized(true);
  }, [project, initialized]);

  const storedColor = project?.primaryColor ?? null;
  const storedPanel = project?.showHelpPanel ?? true;
  const isDirty = initialized && (primaryColor !== storedColor || showHelpPanel !== storedPanel);
  const colorValid = primaryColor == null || HEX_PATTERN.test(primaryColor);
  const canEdit = canUpdate && isEmailVerified;

  const previewColor = useMemo(
    () => (primaryColor && HEX_PATTERN.test(primaryColor) ? primaryColor : GRANT_PRIMARY_COLOR),
    [primaryColor]
  );

  if (loading && !project) {
    return <p className="text-muted-foreground">{tCommon('loading')}</p>;
  }

  if (!project || !parentScope || !projectScope) {
    return <p className="text-destructive">{t('loadError')}</p>;
  }

  const handleSave = async () => {
    if (!colorValid) return;
    setIsSaving(true);
    try {
      await updateProject(project.id, {
        scope: parentScope,
        primaryColor,
        showHelpPanel,
      });
      await refetch();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await updateProject(project.id, {
        scope: parentScope,
        primaryColor: null,
        showHelpPanel: null,
      });
      setPrimaryColor(null);
      setShowHelpPanel(true);
      await refetch();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearPicture = async () => {
    await clearProjectPicture({ projectId: project.id, scope: projectScope });
    await refetch();
  };

  return (
    <FeatureDetailLayout>
      <FeatureModuleCard title={t('picture.title')} description={t('picture.description')}>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 group/avatar">
            <ProjectAvatar project={project} size="lg" className="h-20 w-20" />
            {canEdit ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute inset-0 h-full w-full rounded-full opacity-0 transition-opacity group-hover/avatar:opacity-100 bg-black/50 hover:bg-black/60"
                onClick={() => setUploadOpen(true)}
                aria-label={project.pictureUrl ? t('picture.change') : t('picture.upload')}
              >
                <Pencil className="h-5 w-5 text-white" />
              </Button>
            ) : null}
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('picture.hint')}</p>
            {canEdit && project.pictureUrl ? (
              <Button type="button" variant="outline" size="sm" onClick={handleClearPicture}>
                {t('picture.remove')}
              </Button>
            ) : null}
          </div>
        </div>
      </FeatureModuleCard>

      <FeatureModuleCard
        title={t('theme.title')}
        description={t('theme.description')}
        footer={
          canEdit ? (
            <div className="flex justify-end gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSaving || (storedColor == null && project.showHelpPanel == null)}
              >
                {t('theme.reset')}
              </Button>
              <Button type="button" onClick={handleSave} disabled={!isDirty || !colorValid || isSaving}>
                {isSaving ? tCommon('actions.saving') : tCommon('actions.save')}
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project-primary-color">{t('theme.primaryColor')}</Label>
            <div className="flex items-center gap-3">
              <input
                id="project-primary-color"
                type="color"
                className="h-10 w-12 cursor-pointer rounded-md border bg-transparent"
                value={previewColor}
                disabled={!canEdit}
                onChange={(event) => setPrimaryColor(event.target.value.toUpperCase())}
              />
              <Input
                value={primaryColor ?? ''}
                placeholder={GRANT_PRIMARY_COLOR}
                disabled={!canEdit}
                onChange={(event) => {
                  const next = event.target.value.trim();
                  setPrimaryColor(next === '' ? null : next);
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{t('theme.primaryColorHint')}</p>
            {!colorValid ? (
              <p className="text-sm text-destructive">{t('theme.invalidColor')}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="project-help-panel">{t('theme.helpPanel')}</Label>
              <p className="text-sm text-muted-foreground">{t('theme.helpPanelHint')}</p>
            </div>
            <Switch
              id="project-help-panel"
              checked={showHelpPanel}
              disabled={!canEdit}
              onCheckedChange={setShowHelpPanel}
            />
          </div>
        </div>
      </FeatureModuleCard>

      <SettingImageUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        currentImageUrl={project.pictureUrl || undefined}
        translationNamespace="projects.branding.upload"
        onUpload={async (file) => {
          const result = await uploadProjectPictureDirect(
            { projectId: project.id, scope: projectScope },
            file
          );
          if (result?.url) {
            const { currentProject, setCurrentProject } = useProjectsStore.getState();
            if (currentProject?.id === project.id) {
              setCurrentProject({
                ...currentProject,
                pictureUrl: result.url,
                updatedAt: new Date(),
              });
            }
          }
          await refetch();
        }}
      />
    </FeatureDetailLayout>
  );
}
