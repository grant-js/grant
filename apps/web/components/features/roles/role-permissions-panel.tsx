'use client';

import { useTranslations } from 'next-intl';
import { Permission, Role, RolePermission, Scope } from '@grantjs/schema';
import { Shield } from 'lucide-react';

import { FeatureModuleCard } from '@/components/common';
import { Badge } from '@/components/ui/badge';

interface RolePermissionsPanelProps {
  role: Pick<Role, 'id' | 'name'> & {
    rolePermissions?: Array<
      Pick<RolePermission, 'id' | 'permissionId'> & {
        permission?: Permission | null;
      }
    > | null;
  };
  scope: Scope;
  className?: string;
}

export function RolePermissionsPanel({ role, className }: RolePermissionsPanelProps) {
  const t = useTranslations('roles.permissionsPanel');
  const permissions = role.rolePermissions ?? [];

  return (
    <FeatureModuleCard
      className={className}
      title={
        <span className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {t('title')}
        </span>
      }
      description={t('description', { roleName: role.name })}
    >
      {permissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {permissions.map((rp) => {
            const perm = rp.permission;
            const label = perm
              ? `${perm.resource?.slug ?? 'resource'}:${perm.action} — ${perm.name}`
              : rp.permissionId;
            return (
              <li key={rp.id}>
                <Badge variant="secondary">{label}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </FeatureModuleCard>
  );
}
