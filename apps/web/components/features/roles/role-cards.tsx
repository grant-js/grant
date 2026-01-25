'use client';

import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Role, Tag } from '@grantjs/schema';
import { Shield, Tags } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardBody, CardGrid, CardHeader, ScrollBadges } from '@/components/common';
import { transformTagsToBadges } from '@/lib/tag';
import { useRolesStore } from '@/stores/roles.store';

import { RoleActions } from './role-actions';
import { RoleAudit } from './role-audit';
import { RoleCardSkeleton } from './role-card-skeleton';
import { RoleCreateDialog } from './role-create-dialog';

export function RoleCards() {
  const t = useTranslations('roles');

  const limit = useRolesStore((state) => state.limit);
  const search = useRolesStore((state) => state.search);
  const roles = useRolesStore((state) => state.roles);
  const loading = useRolesStore((state) => state.loading);

  const transformGroupsToBadges = (role: Role) => {
    return (role.groups || []).map((group) => {
      const primaryTag = group.tags?.find((tag: Tag) => tag.isPrimary);
      return {
        id: group.id,
        label: group.name,
        className: primaryTag ? getTagBorderClasses(primaryTag.color as TagColor) : undefined,
      };
    });
  };

  return (
    <CardGrid<Role>
      entities={roles}
      loading={loading}
      emptyState={{
        icon: <Shield />,
        title: search ? t('noSearchResults.title') : t('noRoles.title'),
        description: search ? t('noSearchResults.description') : t('noRoles.description'),
        action: search ? undefined : <RoleCreateDialog />,
      }}
      skeleton={{
        component: <RoleCardSkeleton />,
        count: limit,
      }}
      renderHeader={(role: Role) => (
        <CardHeader
          avatar={{
            initial: role.name.charAt(0),
            size: 'lg',
          }}
          title={role.name}
          description={role.description || undefined}
          color={role.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor}
          actions={<RoleActions role={role} />}
        />
      )}
      renderBody={(role: Role) => (
        <CardBody
          items={[
            {
              label: {
                icon: <Shield className="h-3 w-3" />,
                text: t('form.groups'),
              },
              value: <ScrollBadges items={transformGroupsToBadges(role)} height={80} />,
            },
            {
              label: {
                icon: <Tags className="h-3 w-3" />,
                text: t('form.tags'),
              },
              value: (
                <ScrollBadges
                  items={transformTagsToBadges(role.tags)}
                  height={60}
                  showAsRound={true}
                />
              ),
            },
          ]}
        />
      )}
      renderFooter={(role: Role) => <RoleAudit role={role} />}
    />
  );
}
