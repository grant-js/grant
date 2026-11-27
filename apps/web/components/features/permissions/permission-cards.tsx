'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TagColor } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';
import { CopyCheck, Group as GroupIcon, Package, Play, Tags, Users } from 'lucide-react';

import {
  CardBody,
  CardGrid,
  CardHeader,
  EntityCreateNavigateButton,
  RelationCountChip,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { usePageCardFields } from '@/hooks/common';
import {
  getEntityTagCount,
  getPrimaryTagFromEntity,
  isSyntheticCdmEntity,
} from '@/lib/entity-list';
import { usePermissionsStore } from '@/stores/permissions.store';

import { PermissionActions } from './permission-actions';
import { PermissionAudit } from './permission-audit';
import { PermissionCardSkeleton } from './permission-card-skeleton';
import { PermissionNavigationButton } from './permission-navigation-button';

export function PermissionCards() {
  const t = useTranslations('permissions');
  const tCommon = useTranslations('common');

  const cardFields = useMemo(
    () => [
      { key: 'resource', label: t('form.resource') },
      { key: 'action', label: t('form.action') },
      { key: 'groups', label: t('table.groups') },
      { key: 'users', label: t('table.users') },
      { key: 'tags', label: t('table.tags') },
    ],
    [t]
  );
  const { arrange } = usePageCardFields(cardFields, { listId: 'permissions.list' });

  const limit = usePermissionsStore((state) => state.limit);
  const search = usePermissionsStore((state) => state.search);
  const permissions = usePermissionsStore((state) => state.permissions);
  const loading = usePermissionsStore((state) => state.loading);
  const hideSynthetic = usePermissionsStore((state) => state.hideSyntheticEntities);

  const visiblePermissions = hideSynthetic
    ? permissions.filter(
        (permission) => !isSyntheticCdmEntity(permission.metadata as Record<string, unknown>)
      )
    : permissions;

  return (
    <CardGrid<Permission>
      entities={visiblePermissions}
      loading={loading}
      emptyState={{
        icon: <CopyCheck />,
        title: search ? t('noSearchResults.title') : t('noPermissions.title'),
        description: search ? t('noSearchResults.description') : t('noPermissions.description'),
        action: search ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="permissions"
            label={t('createDialog.trigger')}
            icon={CopyCheck}
            alwaysShowLabel
          />
        ),
      }}
      skeleton={{
        component: <PermissionCardSkeleton />,
        count: limit,
      }}
      renderHeader={(permission: Permission) => {
        const primaryTag = getPrimaryTagFromEntity(permission);
        return (
          <CardHeader
            avatar={{
              initial: permission.name.charAt(0),
              size: 'lg',
            }}
            title={permission.name}
            description={permission.description || undefined}
            color={primaryTag?.color as TagColor | undefined}
            actions={<PermissionActions permission={permission} />}
          />
        );
      }}
      renderBody={(permission: Permission) => (
        <CardBody
          items={arrange([
            {
              key: 'resource',
              label: {
                icon: <Package className="h-3 w-3" />,
                text: t('form.resource'),
              },
              value: permission.resource ? (
                <Badge variant="outline">{permission.resource.name}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              ),
            },
            {
              key: 'action',
              label: {
                icon: <Play className="h-3 w-3" />,
                text: t('form.action'),
              },
              value: <Badge variant="secondary">{permission.action}</Badge>,
            },
            {
              key: 'groups',
              label: {
                icon: <GroupIcon className="h-3 w-3" />,
                text: t('table.groups'),
              },
              value: (
                <RelationCountChip
                  entity="permission"
                  relation="groups"
                  entityId={permission.id}
                  count={permission.groupCount ?? 0}
                >
                  {t('groupCount', { count: permission.groupCount ?? 0 })}
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
                  entity="permission"
                  relation="users"
                  entityId={permission.id}
                  count={permission.userCount ?? 0}
                >
                  {t('userCount', { count: permission.userCount ?? 0 })}
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
                  entity="permission"
                  relation="tags"
                  entityId={permission.id}
                  count={getEntityTagCount(permission)}
                >
                  {tCommon('tagCount', { count: getEntityTagCount(permission) })}
                </RelationCountChip>
              ),
            },
          ])}
        />
      )}
      renderFooter={(permission: Permission) => (
        <div className="flex items-center justify-between w-full gap-2">
          <PermissionAudit permission={permission} />
          <PermissionNavigationButton permission={permission} size="lg" round={true} />
        </div>
      )}
    />
  );
}
