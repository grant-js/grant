'use client';

import { ReactNode } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { TableSkeleton, ColumnConfig as SkeletonColumnConfig } from './TableSkeleton';

export interface ColumnConfig<T> {
  key: string;
  header: string;
  width?: string;
  className?: string;
  render: (item: T) => ReactNode;
}

export interface EmptyStateConfig {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  loading: boolean;
  emptyState: EmptyStateConfig;
  actionsColumn?: {
    render: (item: T) => ReactNode;
  };
  skeletonConfig?: {
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
    return <EmptyState {...emptyState} />;
  }

  if (loading) {
    // Convert columns to skeleton configs
    const skeletonColumns: SkeletonColumnConfig[] = columns.map((column) => ({
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
    <div className="rounded-md border">
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
