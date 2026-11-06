'use client';

import { type ReactNode, useMemo } from 'react';

import { Avatar } from '@/components/common/avatar';
import { DataTable, type DataTableColumnConfig } from '@/components/common/data-table';
import {
  DETAIL_ICON_ONLY_COLUMN,
  DetailTableIconCell,
} from '@/components/common/detail-table-layout';
import { cn } from '@/lib/utils';

export interface EntityDetailInfoRow {
  id: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

interface EntityDetailInfoTableProps {
  rows: EntityDetailInfoRow[];
  fieldColumnHeader: string;
  valueColumnHeader: string;
  /** Scopes the saved column widths. Default `entity.info`, shared by the entity detail pages. */
  tableId?: string;
  /** When false, omits the top separator used below form fields in general cards. Default true. */
  withTopSeparator?: boolean;
}

/**
 * Starting widths when no content can be measured yet; the field and value columns then start as
 * wide as their widest cell. The value column wraps beyond its cap instead of clipping.
 */
const FIELD_COLUMN_FALLBACK_WIDTH = '120px';
const VALUE_COLUMN_FALLBACK_WIDTH = '240px';
const FIELD_COLUMN_MAX_WIDTH_PX = 320;

export function EntityDetailInfoTable({
  rows,
  fieldColumnHeader,
  valueColumnHeader,
  tableId = 'entity.info',
  withTopSeparator = true,
}: EntityDetailInfoTableProps) {
  const columns = useMemo<DataTableColumnConfig<EntityDetailInfoRow>[]>(
    () => [
      {
        key: 'icon',
        header: '',
        ...DETAIL_ICON_ONLY_COLUMN,
        render: (row) => (
          <DetailTableIconCell>
            <Avatar size="sm" initial="" icon={row.icon} />
          </DetailTableIconCell>
        ),
      },
      {
        key: 'field',
        header: fieldColumnHeader,
        width: FIELD_COLUMN_FALLBACK_WIDTH,
        maxWidth: FIELD_COLUMN_MAX_WIDTH_PX,
        enableHiding: false,
        render: (row) => <span className="text-sm text-muted-foreground">{row.label}</span>,
      },
      {
        key: 'value',
        header: valueColumnHeader,
        width: VALUE_COLUMN_FALLBACK_WIDTH,
        columnWidthMode: 'min',
        truncate: false,
        fitContent: true,
        enableHiding: false,
        className: 'whitespace-normal align-middle',
        render: (row) => row.value,
      },
    ],
    [fieldColumnHeader, valueColumnHeader]
  );

  if (rows.length === 0) return null;

  return (
    <div className={cn(withTopSeparator && 'mt-6 border-t pt-4')}>
      <DataTable<EntityDetailInfoRow>
        tableId={tableId}
        data={rows}
        columns={columns}
        loading={false}
        emptyState={{ icon: null, title: '', description: '' }}
      />
    </div>
  );
}
