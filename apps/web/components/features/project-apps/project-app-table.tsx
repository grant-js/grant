'use client';

import { useTranslations } from 'next-intl';
import type { ProjectApp } from '@grantjs/schema';
import { LayoutGrid } from 'lucide-react';

import {
  CopyToClipboard,
  DataTable,
  type DataTableColumnConfig,
  EntityCreateNavigateButton,
  EntityNavigationButton,
  ScrollBadges,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { useScopeFromParams } from '@/hooks/common';
import { getEntityTagCount } from '@/lib/entity-list';
import { useProjectAppsStore } from '@/stores/project-apps.store';

import { ProjectAppActions } from './project-app-actions';
import { ProjectAppSignUpStatusLabel } from './project-app-sign-up-status-label';

export function ProjectAppTable() {
  const t = useTranslations('projectApps');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const projectApps = useProjectAppsStore((state) => state.projectApps);
  const loading = useProjectAppsStore((state) => state.loading);
  const search = useProjectAppsStore((state) => state.search);
  const limit = useProjectAppsStore((state) => state.limit);

  const hasActiveFilters = search.trim() !== '';

  if (!scope) return null;

  const columns: DataTableColumnConfig<ProjectApp>[] = [
    {
      key: 'clientId',
      header: t('table.clientId'),
      width: '320px',
      className: 'pl-4',
      render: (app: ProjectApp) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium font-mono truncate">{app.clientId}</span>
          <CopyToClipboard text={app.clientId} size="sm" variant="ghost" />
        </div>
      ),
    },
    {
      key: 'signUp',
      header: t('table.signUp'),
      width: '120px',
      render: (app: ProjectApp) => <ProjectAppSignUpStatusLabel allowSignUp={app.allowSignUp} />,
    },
    {
      key: 'enabledProviders',
      header: t('table.enabledProviders'),
      width: '180px',
      render: (app: ProjectApp) => (
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
      header: t('table.tags'),
      width: '120px',
      render: (app: ProjectApp) => (
        <Badge variant="secondary">{tCommon('tagCount', { count: getEntityTagCount(app) })}</Badge>
      ),
    },
    {
      key: 'navigation',
      header: '',
      width: '60px',
      render: (app: ProjectApp) => (
        <EntityNavigationButton
          entitySegment="apps"
          entityId={app.id}
          ariaLabel={t('actions.view')}
          size="sm"
        />
      ),
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'clientId', type: 'text' },
      { key: 'signUp', type: 'text' },
      { key: 'enabledProviders', type: 'list' },
      { key: 'tags', type: 'text' },
      { key: 'navigation', type: 'icon' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable<ProjectApp>
      data={projectApps}
      columns={columns}
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
      actionsColumn={{
        render: (app: ProjectApp) => <ProjectAppActions projectApp={app} scope={scope} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
