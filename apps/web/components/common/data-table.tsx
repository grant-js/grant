'use client';

import { ReactNode } from 'react';

import { EmptyState, EmptyStateProps } from '@/components/common';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { TableSkeleton, TableSkeletonColumnConfig } from './table-skeleton';

export interface DataTableColumnConfig<T> {
  key: string;
  header: string;
  width?: string;
  className?: string;
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

  if (showEmptyState) {
    return (
      <div className="flex grow justify-center">
        <EmptyState {...emptyState} />
      </div>
    );
  }

  if (loading) {
    // Use provided skeleton config columns if available, otherwise convert columns to skeleton configs
    const skeletonColumns: TableSkeletonColumnConfig[] =
      skeletonConfig?.columns ||
      columns.map((column) => ({
        key: column.key,
        type: 'text', // Default to text for skeleton
        width: column.width,
      }));

    return (
      <TableSkeleton
        columns={skeletonColumns}
        rowCount={skeletonConfig?.rowCount || 5}
        showActions={!!actionsColumn}
      />
    );
  }

  return (
    <div className="min-w-0 rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={column.className}
                style={{ width: column.width }}
              >
                {column.header}
              </TableHead>
            ))}
            {actionsColumn && <TableHead className="w-[100px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
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
