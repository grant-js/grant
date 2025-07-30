'use client';

import { Shield, Tags } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardGrid, CardHeader } from '@/components/common';
import { ScrollBadges } from '@/components/common';
import { Group } from '@/graphql/generated/types';
import { getTagBorderColorClasses } from '@/lib/tag-colors';
import { transformTagsToBadges } from '@/lib/tag-utils';
import { useGroupsStore } from '@/stores/groups.store';

import { CreateGroupDialog } from './CreateGroupDialog';
import { GroupActions } from './GroupActions';
import { GroupAudit } from './GroupAudit';
import { GroupCardSkeleton } from './GroupCardSkeleton';

export function GroupCards() {
  const t = useTranslations('groups');

  // Use selective subscriptions to prevent unnecessary re-renders
  const limit = useGroupsStore((state) => state.limit);
  const search = useGroupsStore((state) => state.search);
  const groups = useGroupsStore((state) => state.groups);
  const loading = useGroupsStore((state) => state.loading);

  const transformPermissionsToBadges = (group: Group) => {
    return (group.permissions || []).map((permission) => ({
      id: permission.id,
      label: permission.name,
      className: permission.tags?.length
        ? getTagBorderColorClasses(permission.tags[0].color)
        : undefined,
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
          actions={<GroupActions group={group} />}
        />
      )}
      renderBody={(group: Group) => (
        <div className="space-y-3">
          <ScrollBadges
            items={transformPermissionsToBadges(group)}
            title={t('form.permissions')}
            icon={<Shield className="h-3 w-3" />}
            height={80}
          />
          <ScrollBadges
            items={transformTagsToBadges(group.tags)}
            title={t('form.tags')}
            icon={<Tags className="h-3 w-3" />}
            height={60}
            showAsRound={true}
          />
        </div>
      )}
      renderFooter={(group: Group) => <GroupAudit group={group} />}
    />
  );
}
