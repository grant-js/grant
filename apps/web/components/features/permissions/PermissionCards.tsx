'use client';

import { TagColor } from '@logusgraphics/grant-constants';
import { Permission, Tag } from '@logusgraphics/grant-schema';
import { Key, Play, Tags } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardBody, CardGrid, CardHeader, ScrollBadges } from '@/components/common';
import { transformTagsToBadges } from '@/lib/tag-utils';
import { usePermissionsStore } from '@/stores/permissions.store';

import { CreatePermissionDialog } from './CreatePermissionDialog';
import { PermissionActions } from './PermissionActions';
import { PermissionAudit } from './PermissionAudit';
import { PermissionCardSkeleton } from './PermissionCardSkeleton';

export function PermissionCards() {
  const t = useTranslations('permissions');

  const limit = usePermissionsStore((state) => state.limit);
  const search = usePermissionsStore((state) => state.search);
  const permissions = usePermissionsStore((state) => state.permissions);
  const loading = usePermissionsStore((state) => state.loading);

  return (
    <CardGrid<Permission>
      entities={permissions}
      loading={loading}
      emptyState={{
        icon: Key,
        title: search ? t('noSearchResults.title') : t('noPermissions.title'),
        description: search ? t('noSearchResults.description') : t('noPermissions.description'),
        action: search ? undefined : <CreatePermissionDialog />,
      }}
      skeleton={{
        component: <PermissionCardSkeleton />,
        count: limit,
      }}
      renderHeader={(permission: Permission) => (
        <CardHeader
          avatar={{
            initial: permission.name.charAt(0),
            size: 'lg',
          }}
          title={permission.name}
          description={permission.description || undefined}
          color={permission.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor}
          actions={<PermissionActions permission={permission} />}
        />
      )}
      renderBody={(permission: Permission) => (
        <CardBody
          items={[
            {
              label: {
                icon: <Play className="h-3 w-3" />,
                text: t('form.action'),
              },
              value: (
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground block">
                  {permission.action}
                </span>
              ),
            },
            {
              label: {
                icon: <Tags className="h-3 w-3" />,
                text: t('form.tags'),
              },
              value: (
                <ScrollBadges
                  items={transformTagsToBadges(permission.tags)}
                  height={60}
                  showAsRound={true}
                />
              ),
            },
          ]}
        />
      )}
      renderFooter={(permission: Permission) => <PermissionAudit permission={permission} />}
    />
  );
}
