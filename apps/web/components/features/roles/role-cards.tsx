'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TagColor } from '@grantjs/constants';
import { Role } from '@grantjs/schema';
import { Shield, Tags, Users } from 'lucide-react';

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
import { useRolesStore } from '@/stores/roles.store';

import { RoleActions } from './role-actions';
import { RoleAudit } from './role-audit';
import { RoleCardSkeleton } from './role-card-skeleton';
import { RoleNavigationButton } from './role-navigation-button';

export function RoleCards() {
  const t = useTranslations('roles');
  const tCommon = useTranslations('common');

  const cardFields = useMemo(
    () => [
      { key: 'groups', label: t('form.groups') },
      { key: 'users', label: t('table.users') },
      { key: 'tags', label: t('table.tags') },
    ],
    [t]
  );
  const { arrange } = usePageCardFields(cardFields, { listId: 'roles.list' });

  const limit = useRolesStore((state) => state.limit);
  const search = useRolesStore((state) => state.search);
  const roles = useRolesStore((state) => state.roles);
  const loading = useRolesStore((state) => state.loading);
  const hideSynthetic = useRolesStore((state) => state.hideSyntheticEntities);

  const visibleRoles = hideSynthetic
    ? roles.filter((role) => !isSyntheticCdmEntity(role.metadata as Record<string, unknown>))
    : roles;

  return (
    <CardGrid<Role>
      entities={visibleRoles}
      loading={loading}
      emptyState={{
        icon: <Shield />,
        title: search ? t('noSearchResults.title') : t('noRoles.title'),
        description: search ? t('noSearchResults.description') : t('noRoles.description'),
        action: search ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="roles"
            label={t('createDialog.trigger')}
            icon={Shield}
            alwaysShowLabel
          />
        ),
      }}
      skeleton={{
        component: <RoleCardSkeleton />,
        count: limit,
      }}
      renderHeader={(role: Role) => {
        const primaryTag = getPrimaryTagFromEntity(role);
        return (
          <CardHeader
            avatar={{
              initial: role.name.charAt(0),
              size: 'lg',
            }}
            title={role.name}
            description={role.description || undefined}
            color={primaryTag?.color as TagColor | undefined}
            actions={<RoleActions role={role} />}
          />
        );
      }}
      renderBody={(role: Role) => (
        <CardBody
          items={arrange([
            {
              key: 'groups',
              label: {
                icon: <Shield className="h-3 w-3" />,
                text: t('form.groups'),
              },
              value: (
                <RelationCountChip
                  entity="role"
                  relation="groups"
                  entityId={role.id}
                  count={role.groupCount ?? 0}
                >
                  {t('groupCount', { count: role.groupCount ?? 0 })}
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
                  entity="role"
                  relation="users"
                  entityId={role.id}
                  count={role.userCount ?? 0}
                >
                  {t('userCount', { count: role.userCount ?? 0 })}
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
                  entity="role"
                  relation="tags"
                  entityId={role.id}
                  count={getEntityTagCount(role)}
                >
                  {tCommon('tagCount', { count: getEntityTagCount(role) })}
                </RelationCountChip>
              ),
            },
          ])}
        />
      )}
      renderFooter={(role: Role) => (
        <div className="flex items-center justify-between w-full gap-2">
          <RoleAudit role={role} />
          <RoleNavigationButton role={role} size="lg" round={true} />
        </div>
      )}
    />
  );
}
