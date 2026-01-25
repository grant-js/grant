'use client';

import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Resource, Tag } from '@grantjs/schema';
import { Package } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  DataTable,
  ScrollBadges,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { transformTagsToBadges } from '@/lib/tag';
import { cn } from '@/lib/utils';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceActions } from './resource-actions';
import { ResourceAudit } from './resource-audit';
import { ResourceCreateDialog } from './resource-create-dialog';

export function ResourceTable() {
  const t = useTranslations('resources');

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
      render: (resource: Resource) => (
        <Avatar
          initial={resource.name.charAt(0)}
          size="md"
          className={
            resource.tags?.find((tag: Tag) => tag.isPrimary)?.color
              ? cn(
                  'border-2',
                  getTagBorderClasses(
                    resource.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor
                  )
                )
              : undefined
          }
        />
      ),
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
      key: 'actions',
      header: t('form.actions'),
      width: '200px',
      render: (resource: Resource) => (
        <ScrollBadges
          items={
            resource.actions?.map((action) => ({
              id: action,
              label: action,
            })) || []
          }
          height={60}
        />
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '150px',
      render: (resource: Resource) => (
        <ScrollBadges items={transformTagsToBadges(resource.tags)} height={60} showAsRound={true} />
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (resource: Resource) => <ResourceAudit resource={resource} />,
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'slug', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'actions', type: 'list' },
      { key: 'tags', type: 'list' },
      { key: 'audit', type: 'audit' },
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
        action: search ? undefined : <ResourceCreateDialog />,
      }}
      actionsColumn={{
        render: (resource) => <ResourceActions resource={resource} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
