'use client';

import { useTranslations } from 'next-intl';

import type { DataTableColumnConfig } from '@/components/common/data-table';
import { EntityNavigationButton } from '@/components/common/entity-navigation-button';
import {
  DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH,
  type DetailTableColumnWidthMode,
} from '@/lib/detail-table-column-width';
import type { EntitySegment } from '@/lib/entity-detail-url';

/** Related entities a detail table can link to; each has its own detail page. */
export type DetailLinkedEntity = 'user' | 'role' | 'group' | 'permission' | 'resource';

const DETAIL_LINKED_ENTITY_SEGMENT: Record<DetailLinkedEntity, EntitySegment> = {
  user: 'users',
  role: 'roles',
  group: 'groups',
  permission: 'permissions',
  resource: 'resources',
};

/** A link to a related entity's detail page, labelled with its type and name. */
export function DetailEntityLink({
  entity,
  entityId,
  name,
}: {
  entity: DetailLinkedEntity;
  entityId: string;
  name: string;
}) {
  const t = useTranslations('common.openEntity');
  return (
    <EntityNavigationButton
      entitySegment={DETAIL_LINKED_ENTITY_SEGMENT[entity]}
      entityId={entityId}
      ariaLabel={t(entity, { name })}
      size="sm"
    />
  );
}

/**
 * Trailing go-to column of a relationship table. Its empty header keeps it out of the column
 * picker, so it can be neither hidden nor moved. A row whose `getId` returns nothing gets no link.
 */
export function detailEntityLinkColumn<T>(
  entity: DetailLinkedEntity,
  getId: (item: T) => string | null | undefined,
  getName: (item: T) => string
): DataTableColumnConfig<T> {
  return {
    key: 'navigation',
    header: '',
    width: DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH,
    columnWidthMode: 'fixed',
    truncate: false,
    className: 'align-middle py-2 px-2',
    render: (item) => {
      const entityId = getId(item);
      return entityId ? (
        <DetailEntityLink entity={entity} entityId={entityId} name={getName(item)} />
      ) : null;
    },
  };
}

export const DETAIL_ENTITY_LINK_SKELETON = {
  key: 'navigation',
  type: 'icon' as const,
  width: DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH,
  columnWidthMode: 'fixed' as const satisfies DetailTableColumnWidthMode,
};
