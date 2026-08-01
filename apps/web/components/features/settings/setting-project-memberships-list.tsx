'use client';

import { useTranslations } from 'next-intl';
import { MyProjectMembership } from '@grantjs/schema';
import { FolderKanban } from 'lucide-react';

import { Avatar, EmptyState } from '@/components/common';
import { SettingCard } from '@/components/features/settings';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { getInitials } from '@/lib/utils';

export interface SettingProjectMembershipsListProps {
  memberships: MyProjectMembership[];
  loading: boolean;
}

export function SettingProjectMembershipsList({
  memberships,
  loading,
}: SettingProjectMembershipsListProps) {
  const t = useTranslations('settings.projectMemberships');

  if (loading && memberships.length === 0) {
    return (
      <SettingCard title={t('list.title')} description={t('list.description')}>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </SettingCard>
    );
  }

  if (!loading && memberships.length === 0) {
    return (
      <SettingCard title={t('list.title')} description={t('list.description')}>
        <EmptyState
          icon={<FolderKanban className="size-6" />}
          title={t('empty.title')}
          description={t('empty.description')}
        />
      </SettingCard>
    );
  }

  return (
    <SettingCard title={t('list.title')} description={t('list.description')}>
      <ul className="divide-y divide-border rounded-lg border">
        {memberships.map((membership) => {
          const scopeLabel = membership.organizationName
            ? membership.organizationName
            : t('list.personalProject');
          return (
            <li key={membership.projectId}>
              <Link
                href={`/dashboard/settings/projects/${membership.projectId}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <Avatar
                  initial={getInitials(membership.projectName)}
                  imageUrl={membership.pictureUrl || undefined}
                  size="md"
                  className="h-10 w-10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {membership.projectName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {scopeLabel}
                    {membership.role ? ` · ${membership.role}` : ''}
                    {membership.displayName ? ` · ${membership.displayName}` : ''}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </SettingCard>
  );
}
