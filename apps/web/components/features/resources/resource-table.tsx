'use client';

import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Resource } from '@grantjs/schema';
import { Package, PackagePlus } from 'lucide-react';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  EntityCreateNavigateButton,
  EntityNavigationButton,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { getEntityTagCount, getPrimaryTagFromEntity } from '@/lib/entity-list';
import { cn } from '@/lib/utils';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceActions } from './resource-actions';
import { ResourceActiveStatusLabel } from './resource-active-status-label';
import { ResourceAudit } from './resource-audit';

export function ResourceTable() {
  const t = useTranslations('resources');
  const tCommon = useTranslations('common');

  const limit = useResourcesStore((state) => state.limit);
  const search = useResourcesStore((state) => state.search);
  const resources = useResourcesStore((state) => state.resources);
  const loading = useResourcesStore((state) => state.loading);

  const columns: DataTableColumnConfig<Resource>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (resource: Resource) => {
        const primaryTag = getPrimaryTagFromEntity(resource);
        return (
          <Avatar
            initial={resource.name.charAt(0)}
            size="md"
            className={
              primaryTag?.color
                ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
                : undefined
            }
          />
        );
      },
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      render: (resource: Resource) => <span className="text-sm font-medium">{resource.name}</span>,
    },
    {
      key: 'slug',
      header: t('table.slug'),
      width: '200px',
      render: (resource: Resource) => (
        <span className="text-sm text-muted-foreground">{resource.slug}</span>
      ),
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      render: (resource: Resource) => (
        <span className="text-sm text-muted-foreground">
          {resource.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: t('table.isActive'),
      width: '140px',
      render: (resource: Resource) => <ResourceActiveStatusLabel isActive={resource.isActive} />,
    },
    {
      key: 'actions',
      header: t('form.actions'),
      width: '120px',
      render: (resource: Resource) => (
        <Badge variant="secondary">
          {t('actionCount', { count: resource.actions?.length ?? 0 })}
        </Badge>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '120px',
      render: (resource: Resource) => (
        <Badge variant="secondary">
          {tCommon('tagCount', { count: getEntityTagCount(resource) })}
        </Badge>
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (resource: Resource) => <ResourceAudit resource={resource} />,
    },
    {
      key: 'navigation',
      header: '',
      width: '60px',
      render: (resource: Resource) => (
        <EntityNavigationButton
          entitySegment="resources"
          entityId={resource.id}
          ariaLabel={t('actions.view')}
          size="sm"
        />
      ),
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'slug', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'isActive', type: 'text' },
      { key: 'actions', type: 'text' },
      { key: 'tags', type: 'text' },
      { key: 'audit', type: 'audit' },
      { key: 'navigation', type: 'icon' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={resources}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <Package />,
        title: search ? t('noSearchResults.title') : t('noResources.title'),
        description: search ? t('noSearchResults.description') : t('noResources.description'),
        action: search ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="resources"
            label={t('createDialog.trigger')}
            icon={PackagePlus}
            alwaysShowLabel
          />
        ),
      }}
      actionsColumn={{
        render: (resource) => <ResourceActions resource={resource} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
