'use client';

import { getTagBorderClasses, TagColor } from '@logusgraphics/grant-constants';
import { Group, Tag } from '@logusgraphics/grant-schema';
import { Group as GroupIcon, Shield, Tags } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardGrid, CardHeader } from '@/components/common';
import { ScrollBadges } from '@/components/common';
import { transformTagsToBadges } from '@/lib/tag-utils';
import { useGroupsStore } from '@/stores/groups.store';

import { CreateGroupDialog } from './CreateGroupDialog';
import { GroupActions } from './GroupActions';
import { GroupAudit } from './GroupAudit';
import { GroupCardSkeleton } from './GroupCardSkeleton';

export function GroupCards() {
  const t = useTranslations('groups');

  const limit = useGroupsStore((state) => state.limit);
  const search = useGroupsStore((state) => state.search);
  const groups = useGroupsStore((state) => state.groups);
  const loading = useGroupsStore((state) => state.loading);

  const transformPermissionsToBadges = (group: Group) => {
    return (group.permissions || []).map((permission) => {
      const primaryTag = permission.tags?.find((tag: Tag) => tag.isPrimary);
      return {
        id: permission.id,
        label: permission.name,
        className: primaryTag ? getTagBorderClasses(primaryTag.color as TagColor) : undefined,
      };
    });
  };

  return (
    <CardGrid<Group>
      entities={groups}
      loading={loading}
      emptyState={{
        icon: GroupIcon,
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
          color={group.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor}
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
