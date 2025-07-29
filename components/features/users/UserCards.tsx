'use client';

import { UserPlus, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardGrid, CardHeader } from '@/components/common';
import { ScrollBadges } from '@/components/ui/scroll-badges';
import { User } from '@/graphql/generated/types';
import { getTagColorClasses } from '@/lib/tag-colors';

import { CreateUserDialog } from './CreateUserDialog';
import { UserActions } from './UserActions';
import { UserAudit } from './UserAudit';
import { UserCardSkeleton } from './UserCardSkeleton';

interface UserCardsProps {
  limit: number;
  users: User[];
  loading: boolean;
  search: string;
  onEditClick: (user: User) => void;
  onDeleteClick: (user: User) => void;
}

export function UserCards({
  limit,
  users,
  loading,
  search,
  onEditClick,
  onDeleteClick,
}: UserCardsProps) {
  const t = useTranslations('users');

  const transformRolesToBadges = (user: User) => {
    return (user.roles || []).map((role) => ({
      id: role.id,
      label: role.name,
      className: role.tags?.length ? getTagColorClasses(role.tags[0].color) : undefined,
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
          actions={
            <UserActions user={user} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />
          }
        />
      )}
      renderBody={(user: User) => (
        <ScrollBadges
          items={transformRolesToBadges(user)}
          title={t('form.roles')}
          icon={<Shield className="h-3 w-3" />}
          height={80}
        />
      )}
      renderFooter={(user: User) => <UserAudit user={user} />}
    />
  );
}
