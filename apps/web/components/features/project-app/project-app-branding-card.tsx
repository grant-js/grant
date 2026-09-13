'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  isProjectOAuthThemeMode,
  type ProjectApp,
  type ProjectOAuthThemeMode,
} from '@grantjs/schema';
import { Monitor, Moon, Pencil, Sun } from 'lucide-react';

import { FeatureModuleCard } from '@/components/common';
import { ProjectAppAvatar } from '@/components/features/project-apps/project-app-avatar';
import { SettingImageUploadDialog } from '@/components/features/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEmailVerified } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectAppMutations } from '@/hooks/project-apps';
import { GRANT_PRIMARY_COLOR } from '@/lib/oauth-branding';

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

interface ProjectAppBrandingCardProps {
  projectApp: ProjectApp;
  onAfterProjectAppMutation?: () => void | Promise<unknown>;
}

export function ProjectAppBrandingCard({
  projectApp,
  onAfterProjectAppMutation,
}: ProjectAppBrandingCardProps) {
  const t = useTranslations('projectApps.branding');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const isEmailVerified = useEmailVerified();
  const { updateProjectApp, uploadProjectAppPictureDirect, clearProjectAppPicture } =
    useProjectAppMutations();

  const canUpdate = useGrant(ResourceSlug.ProjectApp, ResourceAction.Update, {
    scope: scope!,
    enabled: !!scope,
  });

  const inheritedColor = projectApp.project?.primaryColor ?? null;
  const inheritedPanel = projectApp.project?.showHelpPanel ?? true;

  const [primaryColor, setPrimaryColor] = useState<string | null>(projectApp.primaryColor ?? null);
  const [inheritColor, setInheritColor] = useState(projectApp.primaryColor == null);
  const [showHelpPanel, setShowHelpPanel] = useState(projectApp.showHelpPanel ?? inheritedPanel);
  const [themeMode, setThemeMode] = useState<ProjectOAuthThemeMode | null>(() =>
    isProjectOAuthThemeMode(projectApp.themeMode) ? projectApp.themeMode : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    setPrimaryColor(projectApp.primaryColor ?? null);
    setInheritColor(projectApp.primaryColor == null);
    setShowHelpPanel(projectApp.showHelpPanel ?? inheritedPanel);
    setThemeMode(isProjectOAuthThemeMode(projectApp.themeMode) ? projectApp.themeMode : null);
  }, [
    projectApp.primaryColor,
    projectApp.showHelpPanel,
    projectApp.themeMode,
    inheritedPanel,
    projectApp.pictureUrl,
  ]);

  const nextColor = inheritColor ? null : primaryColor;
  const isDirty =
    nextColor !== (projectApp.primaryColor ?? null) ||
    showHelpPanel !== (projectApp.showHelpPanel ?? inheritedPanel) ||
    themeMode !== (isProjectOAuthThemeMode(projectApp.themeMode) ? projectApp.themeMode : null);
  const colorValid = inheritColor || (primaryColor != null && HEX_PATTERN.test(primaryColor));
  const canEdit = canUpdate && isEmailVerified && !!scope;

  const handleSave = async () => {
    if (!scope || !colorValid) return;
    setIsSaving(true);
    try {
      await updateProjectApp(projectApp.id, {
        scope,
        primaryColor: nextColor,
        showHelpPanel,
        themeMode,
      });
      await onAfterProjectAppMutation?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearPicture = async () => {
    if (!scope) return;
    await clearProjectAppPicture({ projectAppId: projectApp.id, scope });
    await onAfterProjectAppMutation?.();
  };

  return (
    <FeatureModuleCard
      title={t('title')}
      description={t('description')}
      collapsible
      footer={
        canEdit ? (
          <div className="flex justify-end gap-3 w-full">
            <Button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || !colorValid || isSaving}
            >
              {isSaving ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 group/avatar">
            <ProjectAppAvatar projectApp={projectApp} size="lg" className="h-16 w-16" />
            {canEdit ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute inset-0 h-full w-full rounded-full opacity-0 transition-opacity group-hover/avatar:opacity-100 bg-black/50 hover:bg-black/60"
                onClick={() => setUploadOpen(true)}
                aria-label={projectApp.pictureUrl ? t('picture.change') : t('picture.upload')}
              >
                <Pencil className="h-5 w-5 text-white" />
              </Button>
            ) : null}
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {projectApp.pictureUrl ? t('picture.overrideHint') : t('picture.inheritHint')}
            </p>
            {canEdit && projectApp.pictureUrl ? (
              <Button type="button" variant="outline" size="sm" onClick={handleClearPicture}>
                {t('picture.remove')}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="app-inherit-color">{t('theme.inheritColor')}</Label>
            <Switch
              id="app-inherit-color"
              checked={inheritColor}
              disabled={!canEdit}
              onCheckedChange={(checked) => {
                setInheritColor(checked);
                if (checked) setPrimaryColor(null);
                else setPrimaryColor(inheritedColor ?? GRANT_PRIMARY_COLOR);
              }}
            />
          </div>
          {!inheritColor ? (
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-12 cursor-pointer rounded-md border bg-transparent"
                value={
                  primaryColor && HEX_PATTERN.test(primaryColor)
                    ? primaryColor
                    : GRANT_PRIMARY_COLOR
                }
                disabled={!canEdit}
                onChange={(event) => setPrimaryColor(event.target.value.toUpperCase())}
              />
              <Input
                value={primaryColor ?? ''}
                placeholder={inheritedColor ?? GRANT_PRIMARY_COLOR}
                disabled={!canEdit}
                onChange={(event) => setPrimaryColor(event.target.value.trim() || null)}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('theme.inheritsColor', { color: inheritedColor ?? GRANT_PRIMARY_COLOR })}
            </p>
          )}
          {!colorValid ? (
            <p className="text-sm text-destructive">{t('theme.invalidColor')}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="app-help-panel">{t('theme.helpPanel')}</Label>
            <p className="text-sm text-muted-foreground">{t('theme.helpPanelHint')}</p>
          </div>
          <Switch
            id="app-help-panel"
            checked={showHelpPanel}
            disabled={!canEdit}
            onCheckedChange={setShowHelpPanel}
          />
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t('theme.themeMode')}</Label>
            <p className="text-sm text-muted-foreground">{t('theme.themeModeHint')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={themeMode == null ? 'default' : 'outline'}
              size="sm"
              disabled={!canEdit}
              onClick={() => setThemeMode(null)}
            >
              {t('theme.themeModeGrant')}
            </Button>
            <Button
              type="button"
              variant={themeMode === 'light' ? 'default' : 'outline'}
              size="sm"
              disabled={!canEdit}
              onClick={() => setThemeMode('light')}
              className="flex items-center gap-2"
            >
              <Sun className="h-4 w-4" />
              {t('theme.themeModeLight')}
            </Button>
            <Button
              type="button"
              variant={themeMode === 'dark' ? 'default' : 'outline'}
              size="sm"
              disabled={!canEdit}
              onClick={() => setThemeMode('dark')}
              className="flex items-center gap-2"
            >
              <Moon className="h-4 w-4" />
              {t('theme.themeModeDark')}
            </Button>
            <Button
              type="button"
              variant={themeMode === 'system' ? 'default' : 'outline'}
              size="sm"
              disabled={!canEdit}
              onClick={() => setThemeMode('system')}
              className="flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              {t('theme.themeModeSystem')}
            </Button>
          </div>
        </div>
      </div>

      {scope ? (
        <SettingImageUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          currentImageUrl={projectApp.pictureUrl || undefined}
          translationNamespace="projectApps.branding.upload"
          onUpload={async (file) => {
            await uploadProjectAppPictureDirect({ projectAppId: projectApp.id, scope }, file);
            await onAfterProjectAppMutation?.();
          }}
        />
      ) : null}
    </FeatureModuleCard>
  );
}
