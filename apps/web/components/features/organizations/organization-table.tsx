'use client';

import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Organization } from '@grantjs/schema';
import { Building2 } from 'lucide-react';

import {
  DataTable,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { usePageTableColumnVisibility } from '@/hooks/common';
import {
  DATA_TABLE_AVATAR_COLUMN_WIDTH,
  DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH,
} from '@/lib/detail-table-column-width';
import { getEntityTagCount } from '@/lib/entity-list';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { OrganizationActions } from './organization-actions';
import { OrganizationAudit } from './organization-audit';
import { OrganizationAvatar } from './organization-avatar';
import { OrganizationCreateDialog } from './organization-create-dialog';
import { OrganizationNavigationButton } from './organization-navigation-button';

const TABLE_ID = 'organizations.list';

export function OrganizationTable() {
  const t = useTranslations('organizations');
  const tCommon = useTranslations('common');
  const limit = useOrganizationsStore((state) => state.limit);
  const search = useOrganizationsStore((state) => state.search);
  const organizations = useOrganizationsStore((state) => state.organizations);
  const loading = useOrganizationsStore((state) => state.loading);

  const columns: DataTableColumnConfig<Organization>[] = [
    {
      key: 'avatar',
      header: '',
      width: DATA_TABLE_AVATAR_COLUMN_WIDTH,
      className: 'pl-4',
      render: (organization: Organization) => (
        <OrganizationAvatar
          organization={organization}
          size="md"
          interactive
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
      width: '120px',
      render: (organization: Organization) => (
        <Badge variant="secondary">
          {tCommon('tagCount', { count: getEntityTagCount(organization) })}
        </Badge>
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
      width: DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH,
      render: (organization: Organization) => (
        <OrganizationNavigationButton organization={organization} size="sm" round={false} />
      ),
    },
  ];

  const { visibleColumns, filterSkeletonColumns } = usePageTableColumnVisibility(columns, {
    tableId: TABLE_ID,
  });

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: filterSkeletonColumns([
      { key: 'avatar', type: 'avatar-only' },
      { key: 'name', type: 'text' },
      { key: 'slug', type: 'text' },
      { key: 'tags', type: 'text' },
      { key: 'audit', type: 'audit' },
      { key: 'actions', type: 'actions' },
      { key: 'navigation', type: 'button' },
    ]),
    rowCount: limit,
  };

  return (
    <DataTable
      tableId={TABLE_ID}
      data={organizations}
      columns={visibleColumns}
      loading={loading}
      emptyState={{
        icon: <Building2 />,
        title: search ? t('noSearchResults.title') : t('noOrganizations.title'),
        description: search ? t('noSearchResults.description') : t('noOrganizations.description'),
        action: search ? undefined : <OrganizationCreateDialog triggerAlwaysShowLabel />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
