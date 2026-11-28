'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TagColor } from '@grantjs/constants';
import { Group } from '@grantjs/schema';
import { Group as GroupIcon, Shield, Tags, Users } from 'lucide-react';

import {
  CardBody,
  CardGrid,
  CardHeader,
  EntityCreateNavigateButton,
  RelationCountChip,
} from '@/components/common';
import { usePageCardFields } from '@/hooks/common';
import {
  getEntityTagCount,
  getPrimaryTagFromEntity,
  isSyntheticCdmEntity,
} from '@/lib/entity-list';
import { useGroupsStore } from '@/stores/groups.store';

import { GroupActions } from './group-actions';
import { GroupAudit } from './group-audit';
import { GroupCardSkeleton } from './group-card-skeleton';
import { GroupNavigationButton } from './group-navigation-button';

export function GroupCards() {
  const t = useTranslations('groups');
  const tCommon = useTranslations('common');

  const cardFields = useMemo(
    () => [
      { key: 'permissions', label: t('form.permissions') },
      { key: 'users', label: t('table.users') },
      { key: 'tags', label: t('table.tags') },
    ],
    [t]
  );
  const { arrange } = usePageCardFields(cardFields, { listId: 'groups.list' });

  const limit = useGroupsStore((state) => state.limit);
  const search = useGroupsStore((state) => state.search);
  const groups = useGroupsStore((state) => state.groups);
  const loading = useGroupsStore((state) => state.loading);
  const hideSynthetic = useGroupsStore((state) => state.hideSyntheticEntities);

  const visibleGroups = hideSynthetic
    ? groups.filter((group) => !isSyntheticCdmEntity(group.metadata as Record<string, unknown>))
    : groups;

  return (
    <CardGrid<Group>
      entities={visibleGroups}
      loading={loading}
      emptyState={{
        icon: <GroupIcon />,
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
      skeleton={{
        component: <GroupCardSkeleton />,
        count: limit,
      }}
      renderHeader={(group: Group) => {
        const primaryTag = getPrimaryTagFromEntity(group);
        return (
          <CardHeader
            avatar={{
              initial: group.name.charAt(0),
              size: 'lg',
            }}
            title={group.name}
            description={group.description || undefined}
            color={primaryTag?.color as TagColor | undefined}
            actions={<GroupActions group={group} />}
          />
        );
      }}
      renderBody={(group: Group) => (
        <CardBody
          items={arrange([
            {
              key: 'permissions',
              label: {
                icon: <Shield className="h-3 w-3" />,
                text: t('form.permissions'),
              },
              value: (
                <RelationCountChip
                  entity="group"
                  relation="permissions"
                  entityId={group.id}
                  count={group.permissionCount ?? 0}
                >
                  {t('permissionCount', { count: group.permissionCount ?? 0 })}
                </RelationCountChip>
              ),
            },
            {
              key: 'users',
              label: {
                icon: <Users className="h-3 w-3" />,
                text: t('table.users'),
              },
              value: (
                <RelationCountChip
                  entity="group"
                  relation="users"
                  entityId={group.id}
                  count={group.userCount ?? 0}
                >
                  {t('userCount', { count: group.userCount ?? 0 })}
                </RelationCountChip>
              ),
            },
            {
              key: 'tags',
              label: {
                icon: <Tags className="h-3 w-3" />,
                text: t('table.tags'),
              },
              value: (
                <RelationCountChip
                  entity="group"
                  relation="tags"
                  entityId={group.id}
                  count={getEntityTagCount(group)}
                >
                  {tCommon('tagCount', { count: getEntityTagCount(group) })}
                </RelationCountChip>
              ),
            },
          ])}
        />
      )}
      renderFooter={(group: Group) => (
        <div className="flex items-center justify-between w-full gap-2">
          <GroupAudit group={group} />
          <GroupNavigationButton group={group} size="lg" round={true} />
        </div>
      )}
    />
  );
}
