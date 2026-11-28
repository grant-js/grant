'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Avatar } from '@/components/common/avatar';
import { DataTable, type DataTableColumnConfig } from '@/components/common/data-table';
import {
  DETAIL_ENTITY_LINK_SKELETON,
  detailEntityLinkColumn,
  type DetailLinkedEntity,
} from '@/components/common/detail-entity-link-column';
import {
  DETAIL_ICON_ONLY_COLUMN,
  DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS,
  DETAIL_ICON_ONLY_SKELETON,
  DETAIL_TEXT_COLUMN,
  DetailTableIconCell,
} from '@/components/common/detail-table-layout';
import { FeatureModuleCard } from '@/components/common/feature-module-card';
import { Pagination } from '@/components/common/pagination';
import { type RelationPageTarget, useRelationPage } from '@/hooks/common/use-relation-preview';
import { translateNameKey } from '@/lib/translate-or-raw';

import { UserLabel } from './user-label';

/** Rows per page of a relationship card. */
const RELATION_LIST_PAGE_SIZE = 10;

const LINKED_ENTITY: Record<RelationPageTarget['relation'], DetailLinkedEntity> = {
  groups: 'group',
  users: 'user',
};

interface RelatedItem {
  id: string;
  name: string;
  /** Users only: their email shows next to the name. */
  authenticationMethods?: ReadonlyArray<{ provider: string; providerId: string }> | null;
}

export type RelationListCardProps = RelationPageTarget & {
  entityId: string;
  /** Message namespace with `title`, `description`, `empty`, `emptyDescription`, `table.name`. */
  messages: string;
  icon: ReactNode;
};

/**
 * A detail page's read-only list of one relationship (a permission's groups or users, a group's
 * members), a page at a time, each row linking to its own page. It edits nothing: assignments
 * are changed where they already are, on the user's or group's page. A viewer who may not list
 * the related entities sees "Not available", as in the list's count chip.
 */
export function RelationListCard({
  entity,
  relation,
  entityId,
  messages,
  icon,
}: RelationListCardProps) {
  const t = useTranslations(messages);
  const tPreview = useTranslations('common.relationPreview');
  const tRoot = useTranslations();
  const [page, setPage] = useState(1);

  const target = { entity, relation } as RelationPageTarget;
  const { items, totalCount, loading, error } = useRelationPage(target, entityId, {
    page,
    limit: RELATION_LIST_PAGE_SIZE,
  });
  const totalPages = Math.ceil(totalCount / RELATION_LIST_PAGE_SIZE);
  const linkedEntity = LINKED_ENTITY[relation];

  const columns: DataTableColumnConfig<RelatedItem>[] = [
    {
      key: 'icon',
      header: '',
      ...DETAIL_ICON_ONLY_COLUMN,
      render: (item) => (
        <DetailTableIconCell>
          <Avatar initial={item.name.charAt(0)} size="sm" />
        </DetailTableIconCell>
      ),
    },
    {
      key: 'name',
      header: t('table.name'),
      ...DETAIL_TEXT_COLUMN,
      className: DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS,
      render: (item) =>
        relation === 'users' ? (
          <UserLabel user={item} className="text-sm font-medium" />
        ) : (
          <span className="text-sm font-medium">{translateNameKey(tRoot, item.name)}</span>
        ),
    },
    detailEntityLinkColumn<RelatedItem>(
      linkedEntity,
      (item) => item.id,
      (item) => item.name
    ),
  ];

  return (
    <FeatureModuleCard
      title={t('title')}
      description={t('description')}
      collapsible
      footer={
        !error && totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        ) : undefined
      }
    >
      {error ? (
        <p className="text-sm text-muted-foreground" data-testid="relation-list-unavailable">
          {tPreview('notAvailable')}
        </p>
      ) : (
        <DataTable
          tableId={`${entity}.${relation}`}
          data={items ?? []}
          columns={columns}
          loading={loading}
          emptyState={{ icon, title: t('empty'), description: t('emptyDescription') }}
          skeletonConfig={{
            columns: [
              DETAIL_ICON_ONLY_SKELETON,
              { key: 'name', type: 'text', ...DETAIL_TEXT_COLUMN },
              DETAIL_ENTITY_LINK_SKELETON,
            ],
            rowCount: 3,
          }}
        />
      )}
    </FeatureModuleCard>
  );
}
