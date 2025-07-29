'use client';

import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardGrid, CardHeader } from '@/components/common';
import { ScrollBadges } from '@/components/ui/scroll-badges';
import { Group } from '@/graphql/generated/types';
import { getTagColorClasses } from '@/lib/tag-colors';

import { CreateGroupDialog } from './CreateGroupDialog';
import { GroupActions } from './GroupActions';
import { GroupAudit } from './GroupAudit';
import { GroupCardSkeleton } from './GroupCardSkeleton';

interface GroupCardsProps {
  limit: number;
  groups: Group[];
  loading: boolean;
  search: string;
  onEditClick: (group: Group) => void;
  onDeleteClick: (group: Group) => void;
}

export function GroupCards({
  limit,
  groups,
  loading,
  search,
  onEditClick,
  onDeleteClick,
}: GroupCardsProps) {
  const t = useTranslations('groups');

  const transformPermissionsToBadges = (group: Group) => {
    return (group.permissions || []).map((permission) => ({
      id: permission.id,
      label: permission.name,
      className: permission.tags?.length ? getTagColorClasses(permission.tags[0].color) : undefined,
    }));
  };

  return (
    <CardGrid<Group>
      entities={groups}
      loading={loading}
      emptyState={{
        icon: Shield,
        title: search ? t('noSearchResults.title') : t('noGroups.title'),
        description: search ? t('noSearchResults.description') : t('noGroups.description'),
        action: search ? undefined : <CreateGroupDialog />,
      }}
      skeleton={{
        component: <GroupCardSkeleton />,
        count: limit,
      }}
      renderHeader={(group: Group) => (
        <CardHeader
          avatar={{
            initial: group.name.charAt(0),
            size: 'lg',
          }}
          title={group.name}
          description={group.description || undefined}
          color={group.tags?.[0]?.color}
          actions={
            <GroupActions group={group} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />
          }
        />
      )}
      renderBody={(group: Group) => (
        <ScrollBadges
          items={transformPermissionsToBadges(group)}
          title={t('form.permissions')}
          icon={<Shield className="h-3 w-3" />}
          height={80}
        />
      )}
      renderFooter={(group: Group) => <GroupAudit group={group} />}
    />
  );
}
