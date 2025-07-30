'use client';

import { Shield, Tags } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardGrid, CardHeader } from '@/components/common';
import { ScrollBadges } from '@/components/common';
import { Role } from '@/graphql/generated/types';
import { getTagBorderColorClasses } from '@/lib/tag-colors';
import { transformTagsToBadges } from '@/lib/tag-utils';
import { useRolesStore } from '@/stores/roles.store';

import { CreateRoleDialog } from './CreateRoleDialog';
import { RoleActions } from './RoleActions';
import { RoleAudit } from './RoleAudit';
import { RoleCardSkeleton } from './RoleCardSkeleton';

export function RoleCards() {
  const t = useTranslations('roles');

  // Use selective subscriptions to prevent unnecessary re-renders
  const limit = useRolesStore((state) => state.limit);
  const search = useRolesStore((state) => state.search);
  const roles = useRolesStore((state) => state.roles);
  const loading = useRolesStore((state) => state.loading);

  const transformGroupsToBadges = (role: Role) => {
    return (role.groups || []).map((group) => ({
      id: group.id,
      label: group.name,
      className: group.tags?.length ? getTagBorderColorClasses(group.tags[0].color) : undefined,
    }));
  };

  return (
    <CardGrid<Role>
      entities={roles}
      loading={loading}
      emptyState={{
        icon: Shield,
        title: search ? t('noSearchResults.title') : t('noRoles.title'),
        description: search ? t('noSearchResults.description') : t('noRoles.description'),
        action: search ? undefined : <CreateRoleDialog />,
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
          color={role.tags?.[0]?.color}
          actions={<RoleActions role={role} />}
        />
      )}
      renderBody={(role: Role) => (
        <div className="space-y-3">
          <ScrollBadges
            items={transformGroupsToBadges(role)}
            title={t('form.groups')}
            icon={<Shield className="h-3 w-3" />}
            height={80}
          />
          <ScrollBadges
            items={transformTagsToBadges(role.tags)}
            title={t('form.tags')}
            icon={<Tags className="h-3 w-3" />}
            height={60}
            showAsRound={true}
          />
        </div>
      )}
      renderFooter={(role: Role) => <RoleAudit role={role} />}
    />
  );
}
