'use client';

import { useTranslations } from 'next-intl';
import { TagColor } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';
import { CopyCheck, Package, Play, Tags } from 'lucide-react';

import { CardBody, CardGrid, CardHeader, EntityCreateNavigateButton } from '@/components/common';
import { Badge } from '@/components/ui/badge';
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
          items={[
            {
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
              label: {
                icon: <Play className="h-3 w-3" />,
                text: t('form.action'),
              },
              value: <Badge variant="secondary">{permission.action}</Badge>,
            },
            {
              label: {
                icon: <Tags className="h-3 w-3" />,
                text: t('table.tags'),
              },
              value: (
                <Badge variant="secondary">
                  {tCommon('tagCount', { count: getEntityTagCount(permission) })}
                </Badge>
              ),
            },
          ]}
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
