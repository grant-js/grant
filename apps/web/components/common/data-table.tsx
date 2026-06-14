'use client';

import { ReactNode } from 'react';

import { EmptyState, EmptyStateProps } from '@/components/common';
import { DataTableColGroup } from '@/components/common/data-table-colgroup';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  detailTableColumnStyle,
  type DetailTableColumnWidthMode,
} from '@/lib/detail-table-column-width';
import { cn } from '@/lib/utils';

import { TableSkeleton, TableSkeletonColumnConfig } from './table-skeleton';

export interface DataTableColumnConfig<T> {
  key: string;
  header: string;
  width?: string;
  /** When `fixed`, column cannot grow; default `fixed`. Use `min` for content that may widen the table. */
  columnWidthMode?: DetailTableColumnWidthMode;
  className?: string;
  /** When false, column is always shown and excluded from the toggle menu. */
  enableHiding?: boolean;
  /** Overrides default hidden keys for this column. */
  defaultHidden?: boolean;
  render: (item: T) => ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumnConfig<T>[];
  loading: boolean;
  emptyState: EmptyStateProps;
  actionsColumn?: {
    render: (item: T) => ReactNode;
  };
  skeletonConfig?: {
    columns?: TableSkeletonColumnConfig[];
    rowCount?: number;
  };
}

function resolveColumnWidthMode<T>(column: DataTableColumnConfig<T>): DetailTableColumnWidthMode {
  return column.columnWidthMode ?? 'fixed';
}

function resolveTableLayoutClass<T>(columns: DataTableColumnConfig<T>[]): string | undefined {
  const hasWidths = columns.some((column) => column.width);
  if (!hasWidths) {
    return undefined;
  }

  const hasGrowableColumns = columns.some((column) => resolveColumnWidthMode(column) === 'min');

  return hasGrowableColumns ? 'table-auto w-max min-w-full' : 'table-fixed w-full';
}

export function DataTable<T>({
  data,
  columns,
  loading,
  emptyState,
  actionsColumn,
  skeletonConfig,
}: DataTableProps<T>) {
  const hasData = data.length > 0;
  const showEmptyState = !hasData && !loading;
  const tableLayoutClass = resolveTableLayoutClass(columns);

  if (showEmptyState) {
    return (
      <div className="flex grow justify-center">
        <EmptyState {...emptyState} />
      </div>
    );
  }

  if (loading) {
    const skeletonColumns: TableSkeletonColumnConfig[] =
      skeletonConfig?.columns ||
      columns.map((column) => ({
        key: column.key,
        type: 'text',
        width: column.width,
        className: column.className,
        columnWidthMode: column.columnWidthMode,
      }));

    return (
      <TableSkeleton
        columns={skeletonColumns}
        rowCount={skeletonConfig?.rowCount || 5}
        showActions={!!actionsColumn}
        className={tableLayoutClass}
      />
    );
  }

  return (
    <div className="min-w-0 rounded-md border">
      <Table className={cn(tableLayoutClass)}>
        <DataTableColGroup columns={columns} actionsColumn={!!actionsColumn} />
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={column.className}
                style={detailTableColumnStyle(column.width, resolveColumnWidthMode(column))}
              >
                {column.header}
              </TableHead>
            ))}
            {actionsColumn && (
              <TableHead className="w-[100px]" style={detailTableColumnStyle('100px', 'fixed')} />
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    tableLayoutClass === 'table-fixed' && 'min-w-0 overflow-hidden',
                    column.className
                  )}
                  style={detailTableColumnStyle(column.width, resolveColumnWidthMode(column))}
                >
                  {column.render(item)}
                </TableCell>
              ))}
              {actionsColumn && (
                <TableCell className="text-right">{actionsColumn.render(item)}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
