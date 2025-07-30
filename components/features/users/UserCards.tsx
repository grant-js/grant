'use client';

import { UserPlus, Shield, Tags } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardGrid, CardHeader } from '@/components/common';
import { ScrollBadges } from '@/components/common';
import { User } from '@/graphql/generated/types';
import { getTagBorderColorClasses } from '@/lib/tag-colors';
import { transformTagsToBadges } from '@/lib/tag-utils';
import { useUsersStore } from '@/stores/users.store';

import { CreateUserDialog } from './CreateUserDialog';
import { UserActions } from './UserActions';
import { UserAudit } from './UserAudit';
import { UserCardSkeleton } from './UserCardSkeleton';

export function UserCards() {
  const t = useTranslations('users');

  // Use selective subscriptions to prevent unnecessary re-renders
  const limit = useUsersStore((state) => state.limit);
  const search = useUsersStore((state) => state.search);
  const users = useUsersStore((state) => state.users);
  const loading = useUsersStore((state) => state.loading);

  const transformRolesToBadges = (user: User) => {
    return (user.roles || []).map((role) => ({
      id: role.id,
      label: role.name,
      className: role.tags?.length ? getTagBorderColorClasses(role.tags[0].color) : undefined,
    }));
  };

  return (
    <CardGrid<User>
      entities={users}
      loading={loading}
      emptyState={{
        icon: UserPlus,
        title: search ? t('noSearchResults.title') : t('noUsers.title'),
        description: search ? t('noSearchResults.description') : t('noUsers.description'),
        action: search ? undefined : <CreateUserDialog />,
      }}
      skeleton={{
        component: <UserCardSkeleton />,
        count: limit,
      }}
      renderHeader={(user: User) => (
        <CardHeader
          avatar={{
            initial: user.name.charAt(0),
            size: 'lg',
          }}
          title={user.name}
          description={user.email}
          color={user.tags?.[0]?.color}
          actions={<UserActions user={user} />}
        />
      )}
      renderBody={(user: User) => (
        <div className="space-y-3">
          <ScrollBadges
            items={transformRolesToBadges(user)}
            title={t('form.roles')}
            icon={<Shield className="h-3 w-3" />}
            height={80}
          />
          <ScrollBadges
            items={transformTagsToBadges(user.tags)}
            title={t('form.tags')}
            icon={<Tags className="h-3 w-3" />}
            height={60}
            showAsRound={true}
          />
        </div>
      )}
      renderFooter={(user: User) => <UserAudit user={user} />}
    />
  );
}
