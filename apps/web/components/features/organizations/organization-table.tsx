'use client';

import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Organization } from '@grantjs/schema';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Avatar,
  DataTable,
  ScrollBadges,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { transformTagsToBadges } from '@/lib/tag';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { OrganizationActions } from './organization-actions';
import { OrganizationAudit } from './organization-audit';
import { OrganizationCreateDialog } from './organization-create-dialog';
import { OrganizationNavigationButton } from './organization-navigation-button';

export function OrganizationTable() {
  const t = useTranslations('organizations');
  const limit = useOrganizationsStore((state) => state.limit);
  const search = useOrganizationsStore((state) => state.search);
  const organizations = useOrganizationsStore((state) => state.organizations);
  const loading = useOrganizationsStore((state) => state.loading);

  const columns: DataTableColumnConfig<Organization>[] = [
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

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
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
        icon: <Building2 />,
        title: search ? t('noSearchResults.title') : t('noOrganizations.title'),
        description: search ? t('noSearchResults.description') : t('noOrganizations.description'),
        action: search ? undefined : <OrganizationCreateDialog />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
