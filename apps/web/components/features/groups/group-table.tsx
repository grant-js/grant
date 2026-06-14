'use client';

import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Group } from '@grantjs/schema';
import { Group as GroupIcon, Shield } from 'lucide-react';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  EntityCreateNavigateButton,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import {
  getEntityTagCount,
  getPrimaryTagFromEntity,
  isSyntheticCdmEntity,
} from '@/lib/entity-list';
import { cn } from '@/lib/utils';
import { useGroupsStore } from '@/stores/groups.store';

import { GroupActions } from './group-actions';
import { GroupAudit } from './group-audit';
import { GroupNavigationButton } from './group-navigation-button';

export function GroupTable() {
  const t = useTranslations('groups');
  const tCommon = useTranslations('common');

  const limit = useGroupsStore((state) => state.limit);
  const search = useGroupsStore((state) => state.search);
  const groups = useGroupsStore((state) => state.groups);
  const loading = useGroupsStore((state) => state.loading);
  const hideSynthetic = useGroupsStore((state) => state.hideSyntheticEntities);

  const visibleGroups = hideSynthetic
    ? groups.filter((group) => !isSyntheticCdmEntity(group.metadata as Record<string, unknown>))
    : groups;

  const columns: DataTableColumnConfig<Group>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (group: Group) => {
        const primaryTag = getPrimaryTagFromEntity(group);
        return (
          <Avatar
            initial={group.name.charAt(0)}
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
      render: (group: Group) => <span className="text-sm font-medium">{group.name}</span>,
    },
    {
      key: 'description',
      header: t('table.description'),
      width: '250px',
      render: (group: Group) => (
        <span className="text-sm text-muted-foreground">
          {group.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: 'permissions',
      header: t('form.permissions'),
      width: '120px',
      render: (group: Group) => (
        <Badge variant="secondary">
          {t('permissionCount', { count: group.permissionCount ?? 0 })}
        </Badge>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '120px',
      render: (group: Group) => (
        <Badge variant="secondary">
          {tCommon('tagCount', { count: getEntityTagCount(group) })}
        </Badge>
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (group: Group) => <GroupAudit group={group} />,
    },
    {
      key: 'navigation',
      header: '',
      width: '60px',
      render: (group: Group) => <GroupNavigationButton group={group} size="sm" round={false} />,
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'permissions', type: 'text' },
      { key: 'tags', type: 'text' },
      { key: 'audit', type: 'audit' },
      { key: 'navigation', type: 'icon' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={visibleGroups}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <Shield />,
        title: search ? t('noSearchResults.title') : t('noGroups.title'),
        description: search ? t('noSearchResults.description') : t('noGroups.description'),
        action: search ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="groups"
            label={t('createDialog.trigger')}
            icon={GroupIcon}
            alwaysShowLabel
          />
        ),
      }}
      actionsColumn={{
        render: (group) => <GroupActions group={group} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
