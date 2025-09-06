'use client';

import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScrollBadges } from '@/components/common';
import { Avatar } from '@/components/common/Avatar';
import { DataTable, type ColumnConfig } from '@/components/common/DataTable';
import { type ColumnConfig as SkeletonColumnConfig } from '@/components/common/TableSkeleton';
import { Organization } from '@/graphql/generated/types';
import { getTagBorderClasses, TagColor } from '@/lib/constants/colors';
import { transformTagsToBadges } from '@/lib/tag-utils';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { CreateOrganizationDialog } from './CreateOrganizationDialog';
import { OrganizationActions } from './OrganizationActions';
import { OrganizationAudit } from './OrganizationAudit';
import { OrganizationNavigationButton } from './OrganizationNavigationButton';

export function OrganizationTable() {
  const t = useTranslations('organizations');
  const limit = useOrganizationsStore((state) => state.limit);
  const search = useOrganizationsStore((state) => state.search);
  const organizations = useOrganizationsStore((state) => state.organizations);
  const loading = useOrganizationsStore((state) => state.loading);

  const columns: ColumnConfig<Organization>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (organization: Organization) => (
        <Avatar
          initial={organization.name.charAt(0)}
          size="md"
          className={
            organization?.tags?.find((tag) => tag.isPrimary)?.color
              ? `border-2 ${getTagBorderClasses(organization.tags?.find((tag) => tag.isPrimary)?.color as TagColor)}`
              : undefined
          }
        />
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      width: '240px',
      render: (organization: Organization) => (
        <span className="text-sm font-medium">{organization.name}</span>
      ),
    },
    {
      key: 'slug',
      header: t('table.slug'),
      width: '250px',
      render: (organization: Organization) => (
        <span className="text-sm text-muted-foreground">{organization.slug}</span>
      ),
    },
    {
      key: 'tags',
      header: t('table.tags'),
      width: '150px',
      render: (organization: Organization) => (
        <ScrollBadges
          items={transformTagsToBadges(organization.tags)}
          height={60}
          showAsRound={true}
        />
      ),
    },
    {
      key: 'audit',
      header: t('table.audit'),
      width: '200px',
      render: (organization: Organization) => <OrganizationAudit organization={organization} />,
    },
    {
      key: 'actions',
      header: t('table.actions'),
      width: '100px',
      render: (organization: Organization) => <OrganizationActions organization={organization} />,
    },
    {
      key: 'navigation',
      header: '',
      width: '60px',
      render: (organization: Organization) => (
        <OrganizationNavigationButton organization={organization} size="sm" round={false} />
      ),
    },
  ];

  const skeletonConfig: { columns: SkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'slug', type: 'text' },
      { key: 'tags', type: 'list' },
      { key: 'audit', type: 'audit' },
      { key: 'actions', type: 'actions' },
      { key: 'navigation', type: 'button' },
    ],
    rowCount: limit,
  };

  return (
    <DataTable
      data={organizations}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <Building2 className="h-12 w-12" />,
        title: search ? t('noSearchResults.title') : t('noOrganizations.title'),
        description: search ? t('noSearchResults.description') : t('noOrganizations.description'),
        action: search ? undefined : <CreateOrganizationDialog />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
