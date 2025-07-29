'use client';

import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar } from '@/components/common/Avatar';
import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { ScrollBadges } from '@/components/ui/scroll-badges';
import { Group } from '@/graphql/generated/types';
import { getAvatarBorderColorClasses, getTagColorClasses } from '@/lib/tag-colors';

import { CreateGroupDialog } from './CreateGroupDialog';
import { GroupActions } from './GroupActions';
import { GroupAudit } from './GroupAudit';

interface GroupTableProps {
  limit: number;
  groups: Group[];
  loading: boolean;
  search: string;
  onEditClick: (group: Group) => void;
  onDeleteClick: (group: Group) => void;
}

export function GroupTable({
  limit,
  groups,
  loading,
  search,
  onEditClick,
  onDeleteClick,
}: GroupTableProps) {
  const t = useTranslations('groups');

  const transformPermissionsToBadges = (group: Group) => {
    return (group.permissions || []).map((permission) => ({
      id: permission.id,
      label: permission.name,
      className: permission.tags?.length ? getTagColorClasses(permission.tags[0].color) : undefined,
    }));
  };

  const columns: ColumnConfig<Group>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (group: Group) => (
        <Avatar
          initial={group.name.charAt(0)}
          size="md"
          className={
            group.tags?.[0]?.color
              ? `border-2 ${getAvatarBorderColorClasses(group.tags[0].color)}`
              : undefined
          }
        />
      ),
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
      width: '200px',
      render: (group: Group) => (
        <ScrollBadges
          items={transformPermissionsToBadges(group)}
          title=""
          icon={<Shield className="h-3 w-3" />}
          height={60}
        />
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (group: Group) => <GroupAudit group={group} />,
    },
  ];

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'description', type: 'text' },
      { key: 'permissions', type: 'list' },
      { key: 'audit', type: 'audit' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={groups}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <Shield className="h-12 w-12" />,
        title: search ? t('noSearchResults.title') : t('noGroups.title'),
        description: search ? t('noSearchResults.description') : t('noGroups.description'),
        action: search ? undefined : <CreateGroupDialog />,
      }}
      actionsColumn={{
        render: (group) => (
          <GroupActions group={group} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />
        ),
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
