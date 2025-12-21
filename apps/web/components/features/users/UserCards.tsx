'use client';

import { getTagBorderClasses, TagColor } from '@logusgraphics/grant-constants';
import { Tag, User } from '@logusgraphics/grant-schema';
import { Shield, Tags, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardBody, CardGrid, CardHeader, ScrollBadges } from '@/components/common';
import { transformTagsToBadges } from '@/lib/tag-utils';
import { getInitials } from '@/lib/utils';
import { useUsersStore } from '@/stores/users.store';

import { CreateUserDialog } from './CreateUserDialog';
import { UserActions } from './UserActions';
import { UserAudit } from './UserAudit';
import { UserCardSkeleton } from './UserCardSkeleton';
import { UserNavigationButton } from './UserNavigationButton';

export function UserCards() {
  const t = useTranslations('users');

  const limit = useUsersStore((state) => state.limit);
  const search = useUsersStore((state) => state.search);
  const users = useUsersStore((state) => state.users);
  const loading = useUsersStore((state) => state.loading);

  const transformRolesToBadges = (user: User) => {
    return (user.roles || []).map((role) => {
      const primaryTag = role.tags?.find((tag: Tag) => tag.isPrimary);
      return {
        id: role.id,
        label: role.name,
        className: primaryTag ? getTagBorderClasses(primaryTag.color as TagColor) : undefined,
      };
    });
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
            initial: getInitials(user.name),
            imageUrl: user.pictureUrl || undefined,
            cacheBuster: user.updatedAt,
            size: 'lg',
          }}
          title={user.name}
          color={user.tags?.find((tag: Tag) => tag.isPrimary)?.color as TagColor}
          actions={<UserActions user={user} />}
        />
      )}
      renderBody={(user: User) => (
        <CardBody
          items={[
            {
              label: {
                icon: <Shield className="h-3 w-3" />,
                text: t('form.roles'),
              },
              value: <ScrollBadges items={transformRolesToBadges(user)} height={80} />,
            },
            {
              label: {
                icon: <Tags className="h-3 w-3" />,
                text: t('form.tags'),
              },
              value: (
                <ScrollBadges
                  items={transformTagsToBadges(user.tags)}
                  height={60}
                  showAsRound={true}
                />
              ),
            },
          ]}
        />
      )}
      renderFooter={(user: User) => (
        <div className="flex items-center justify-between w-full gap-2">
          <UserAudit user={user} />
          <UserNavigationButton user={user} size="lg" round={true} />
        </div>
      )}
    />
  );
}
