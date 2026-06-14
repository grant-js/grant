'use client';

import { useTranslations } from 'next-intl';
import { TagColor } from '@grantjs/constants';
import { User } from '@grantjs/schema';
import { KeyRound, LogIn, Shield, Tags, UserPlus } from 'lucide-react';

import {
  CardBody,
  CardGrid,
  CardHeader,
  EntityCreateNavigateButton,
  ScrollBadges,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import {
  getEntityTagCount,
  getPrimaryTagFromEntity,
  isSyntheticCdmEntity,
} from '@/lib/entity-list';
import { getInitials } from '@/lib/utils';
import { useUsersStore } from '@/stores/users.store';

import { UserActions } from './user-actions';
import { UserAudit } from './user-audit';
import { UserCardSkeleton } from './user-card-skeleton';
import { UserNavigationButton } from './user-navigation-button';

export function UserCards() {
  const t = useTranslations('users');
  const tCommon = useTranslations('common');

  const limit = useUsersStore((state) => state.limit);
  const search = useUsersStore((state) => state.search);
  const users = useUsersStore((state) => state.users);
  const loading = useUsersStore((state) => state.loading);
  const hideSynthetic = useUsersStore((state) => state.hideSyntheticEntities);

  const tProjectApps = useTranslations('projectApps');
  const transformAuthMethodsToBadges = (user: User) =>
    (user.authenticationMethods ?? []).map((m) => ({
      id: `${m.provider}:${m.providerId}`,
      label: tProjectApps(`providers.${m.provider}` as 'providers.email' | 'providers.github'),
      title: m.providerId,
    }));

  const visibleUsers = hideSynthetic
    ? users.filter((user) => !isSyntheticCdmEntity(user.metadata as Record<string, unknown>))
    : users;

  return (
    <CardGrid<User>
      entities={visibleUsers}
      loading={loading}
      emptyState={{
        icon: <UserPlus />,
        title: search ? t('noSearchResults.title') : t('noUsers.title'),
        description: search ? t('noSearchResults.description') : t('noUsers.description'),
        action: search ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="users"
            label={t('createDialog.trigger')}
            icon={UserPlus}
            alwaysShowLabel
          />
        ),
      }}
      skeleton={{
        component: <UserCardSkeleton />,
        count: limit,
      }}
      renderHeader={(user: User) => {
        const primaryTag = getPrimaryTagFromEntity(user);
        return (
          <CardHeader
            avatar={{
              initial: getInitials(user.name),
              imageUrl: user.pictureUrl || undefined,
              cacheBuster: user.updatedAt,
              size: 'lg',
            }}
            title={user.name}
            color={primaryTag?.color as TagColor | undefined}
            actions={<UserActions user={user} />}
          />
        );
      }}
      renderBody={(user: User) => (
        <CardBody
          items={[
            {
              label: {
                icon: <Shield className="h-3 w-3" />,
                text: t('form.roles'),
              },
              value: (
                <Badge variant="secondary">{t('roleCount', { count: user.roleCount ?? 0 })}</Badge>
              ),
            },
            {
              label: {
                icon: <KeyRound className="h-3 w-3" />,
                text: t('form.apiKeys'),
              },
              value: (
                <Badge variant="secondary">
                  {t('apiKeyCount', { count: user.projectUserApiKeyCount ?? 0 })}
                </Badge>
              ),
            },
            {
              label: {
                icon: <LogIn className="h-3 w-3" />,
                text: t('form.authMethods'),
              },
              value: <ScrollBadges items={transformAuthMethodsToBadges(user)} height={60} />,
            },
            {
              label: {
                icon: <Tags className="h-3 w-3" />,
                text: t('table.tags'),
              },
              value: (
                <Badge variant="secondary">
                  {tCommon('tagCount', { count: getEntityTagCount(user) })}
                </Badge>
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
