'use client';

import type { ReactNode } from 'react';

import { Avatar } from '@/components/common/avatar';
import { DataTableColGroup } from '@/components/common/data-table-colgroup';
import {
  DETAIL_CONTENT_COLUMN_CLASS,
  DETAIL_ICON_ONLY_COLUMN,
  DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS,
  DETAIL_INFO_FIELD_COLUMN_WIDTH,
  DetailTableIconCell,
} from '@/components/common/detail-table-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { detailTableColumnStyle } from '@/lib/detail-table-column-width';
import { cn } from '@/lib/utils';

interface EntityDetailInfoRow {
  id: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

interface EntityDetailInfoTableProps {
  rows: EntityDetailInfoRow[];
  fieldColumnHeader: string;
  valueColumnHeader: string;
  /** When false, omits the top separator used below form fields in general cards. Default true. */
  withTopSeparator?: boolean;
}

export function EntityDetailInfoTable({
  rows,
  fieldColumnHeader,
  valueColumnHeader,
  withTopSeparator = true,
}: EntityDetailInfoTableProps) {
  return (
    <div className={cn(withTopSeparator && 'mt-6 border-t pt-4')}>
      <div className="min-w-0 rounded-md border">
        <Table className="table-fixed w-full">
          <DataTableColGroup
            columns={[
              { key: 'icon', width: DETAIL_ICON_ONLY_COLUMN.width },
              { key: 'field', width: DETAIL_INFO_FIELD_COLUMN_WIDTH },
              { key: 'value' },
            ]}
          />
          <TableHeader>
            <TableRow>
              <TableHead
                className={DETAIL_ICON_ONLY_COLUMN.className}
                style={detailTableColumnStyle(
                  DETAIL_ICON_ONLY_COLUMN.width,
                  DETAIL_ICON_ONLY_COLUMN.columnWidthMode
                )}
              />
              <TableHead
                className="whitespace-nowrap"
                style={detailTableColumnStyle(DETAIL_INFO_FIELD_COLUMN_WIDTH, 'fixed')}
              >
                {fieldColumnHeader}
              </TableHead>
              <TableHead className="min-w-0">{valueColumnHeader}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell
                  className={DETAIL_ICON_ONLY_COLUMN.className}
                  style={detailTableColumnStyle(
                    DETAIL_ICON_ONLY_COLUMN.width,
                    DETAIL_ICON_ONLY_COLUMN.columnWidthMode
                  )}
                >
                  <DetailTableIconCell>
                    <Avatar size="sm" initial="" icon={row.icon} />
                  </DetailTableIconCell>
                </TableCell>
                <TableCell
                  className={cn('whitespace-nowrap', DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS)}
                  style={detailTableColumnStyle(DETAIL_INFO_FIELD_COLUMN_WIDTH, 'fixed')}
                >
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                </TableCell>
                <TableCell className={cn('min-w-0 whitespace-normal', DETAIL_CONTENT_COLUMN_CLASS)}>
                  {row.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
