'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TagColor } from '@grantjs/constants';
import type { ProjectApp, Tag } from '@grantjs/schema';
import { Fingerprint, LayoutGrid, LogIn, Tags, UserPlus } from 'lucide-react';

import {
  CardBody,
  CardGrid,
  CardHeader,
  CopyToClipboard,
  EntityCreateNavigateButton,
  EntityNavigationButton,
  LoadedCountChip,
  ScrollBadges,
} from '@/components/common';
import { usePageCardFields, useScopeFromParams } from '@/hooks/common';
import { getEntityTagCount } from '@/lib/entity-list';
import { useProjectAppsStore } from '@/stores/project-apps.store';

import { ProjectAppActions } from './project-app-actions';
import { ProjectAppAudit } from './project-app-audit';
import { ProjectAppCardSkeleton } from './project-app-card-skeleton';
import { ProjectAppSignUpStatusLabel } from './project-app-sign-up-status-label';

export function ProjectAppCards() {
  const t = useTranslations('projectApps');
  const tCommon = useTranslations('common');

  const cardFields = useMemo(
    () => [
      { key: 'clientId', label: t('table.clientId') },
      { key: 'signUp', label: t('table.signUp') },
      { key: 'enabledProviders', label: t('table.enabledProviders') },
      { key: 'tags', label: t('table.tags') },
    ],
    [t]
  );
  const { arrange } = usePageCardFields(cardFields, { listId: 'projectApps.list' });
  const scope = useScopeFromParams();
  const projectApps = useProjectAppsStore((state) => state.projectApps);
  const loading = useProjectAppsStore((state) => state.loading);
  const search = useProjectAppsStore((state) => state.search);
  const limit = useProjectAppsStore((state) => state.limit);

  const hasActiveFilters = search.trim() !== '';

  if (!scope) return null;

  return (
    <CardGrid<ProjectApp>
      entities={projectApps}
      loading={loading}
      emptyState={{
        icon: <LayoutGrid />,
        title: hasActiveFilters ? t('noSearchResults.title') : t('empty.title'),
        description: hasActiveFilters ? t('noSearchResults.description') : t('empty.description'),
        action: hasActiveFilters ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="apps"
            label={t('createDialog.trigger')}
            icon={LayoutGrid}
            alwaysShowLabel
          />
        ),
      }}
      skeleton={{
        component: <ProjectAppCardSkeleton />,
        count: limit,
      }}
      renderHeader={(app: ProjectApp) => {
        const primaryTagColor = app.tags?.find((tag: Tag) => tag.isPrimary)?.color;
        return (
          <CardHeader
            avatar={{
              initial: (app.name || app.clientId).charAt(0),
              imageUrl: app.pictureUrl || undefined,
              cacheBuster: app.updatedAt,
              size: 'lg',
              icon: <LayoutGrid className="h-5 w-5 text-muted-foreground" />,
            }}
            title={app.name || app.clientId}
            color={primaryTagColor as TagColor | undefined}
            actions={<ProjectAppActions projectApp={app} scope={scope} />}
          />
        );
      }}
      renderBody={(app: ProjectApp) => (
        <CardBody
          items={arrange([
            {
              key: 'clientId',
              label: {
                icon: <Fingerprint className="h-3 w-3" />,
                text: t('table.clientId'),
              },
              value: (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-mono truncate">
                    {app.clientId}
                  </span>
                  <CopyToClipboard text={app.clientId} size="sm" variant="ghost" />
                </div>
              ),
            },
            {
              key: 'signUp',
              label: {
                icon: <UserPlus className="h-3 w-3" />,
                text: t('table.signUp'),
              },
              value: <ProjectAppSignUpStatusLabel allowSignUp={app.allowSignUp} />,
            },
            {
              key: 'enabledProviders',
              label: {
                icon: <LogIn className="h-3 w-3" />,
                text: t('table.enabledProviders'),
              },
              value: (
                <ScrollBadges
                  items={
                    app.enabledProviders?.map((provider) => ({
                      id: provider,
                      label: t(`providers.${provider}` as 'providers.email' | 'providers.github'),
                    })) ?? []
                  }
                  height={60}
                />
              ),
            },
            {
              key: 'tags',
              label: {
                icon: <Tags className="h-3 w-3" />,
                text: t('table.tags'),
              },
              value: (
                <LoadedCountChip items={app.tags} count={getEntityTagCount(app)}>
                  {tCommon('tagCount', { count: getEntityTagCount(app) })}
                </LoadedCountChip>
              ),
            },
          ])}
        />
      )}
      renderFooter={(app: ProjectApp) => (
        <div className="flex items-center justify-between w-full gap-2">
          <ProjectAppAudit projectApp={app} />
          <EntityNavigationButton
            entitySegment="apps"
            entityId={app.id}
            ariaLabel={t('actions.view')}
            size="lg"
          />
        </div>
      )}
    />
  );
}
