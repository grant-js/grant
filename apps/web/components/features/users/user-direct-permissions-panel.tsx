'use client';

import { useTranslations } from 'next-intl';
import { Permission, Scope, User, UserPermission } from '@grantjs/schema';
import { Shield } from 'lucide-react';

import { FeatureModuleCard } from '@/components/common';
import { Badge } from '@/components/ui/badge';

interface UserDirectPermissionsPanelProps {
  user: Pick<User, 'id' | 'name'> & {
    userPermissions?: Array<
      Pick<UserPermission, 'id' | 'permissionId'> & {
        permission?: Permission | null;
      }
    > | null;
  };
  scope: Scope;
  className?: string;
}

export function UserDirectPermissionsPanel({ user, className }: UserDirectPermissionsPanelProps) {
  const t = useTranslations('users.permissionsPanel');
  const permissions = user.userPermissions ?? [];

  return (
    <FeatureModuleCard
      className={className}
      title={
        <span className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {t('title')}
        </span>
      }
      description={t('description', { userName: user.name })}
    >
      {permissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {permissions.map((up) => {
            const perm = up.permission;
            const label = perm
              ? `${perm.resource?.slug ?? 'resource'}:${perm.action} — ${perm.name}`
              : up.permissionId;
            return (
              <li key={up.id}>
                <Badge variant="secondary">{label}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </FeatureModuleCard>
  );
}
