'use client';

import { isValidElement, type ReactNode } from 'react';

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

import { EmptyState, type EmptyStateProps } from './empty-state';
import { TableSkeleton, TableSkeletonColumnConfig } from './table-skeleton';

const CHROME_COLUMN_WIDTHS = new Set(['2.5rem', '2.75rem']);

export interface DataTableColumnConfig<T> {
  key: string;
  header: string;
  width?: string;
  /** When `fixed`, column keeps its width; default `fixed`. Use `min` for columns that share leftover space. */
  columnWidthMode?: DetailTableColumnWidthMode;
  className?: string;
  /** When false, the cell is not ellipsized (checkbox, icon, and similar chrome). Default true. */
  truncate?: boolean;
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
  /**
   * When it returns a node for an item, that item renders as one cell spanning every column
   * instead of a data row (e.g. a group header row).
   */
  fullWidthRow?: (item: T) => ReactNode | null | undefined;
}

function resolveColumnWidthMode<T>(column: DataTableColumnConfig<T>): DetailTableColumnWidthMode {
  return column.columnWidthMode ?? 'fixed';
}

function resolveTableLayoutClass(): string {
  return 'table-fixed w-full';
}

function isChromeColumnClassName(className?: string): boolean {
  if (!className) {
    return false;
  }

  return (
    (className.includes('w-10') && className.includes('min-w-10')) ||
    (className.includes('w-11') && className.includes('min-w-11'))
  );
}

function shouldTruncateDataTableColumn<T>(column: DataTableColumnConfig<T>): boolean {
  if (column.truncate === false) {
    return false;
  }

  if (column.truncate === true) {
    return true;
  }

  if (isChromeColumnClassName(column.className)) {
    return false;
  }

  return !(
    resolveColumnWidthMode(column) === 'fixed' &&
    column.width !== undefined &&
    CHROME_COLUMN_WIDTHS.has(column.width)
  );
}

function textFromReactNode(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textFromReactNode).filter(Boolean).join(' ');
  }

  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode; title?: string };
    if (typeof props.title === 'string' && props.title) {
      return props.title;
    }
    return textFromReactNode(props.children);
  }

  return '';
}

function DataTableCellContent({ children, truncate }: { children: ReactNode; truncate: boolean }) {
  if (!truncate) {
    return children;
  }

  const title = textFromReactNode(children).trim();

  return (
    <div className="min-w-0 max-w-full truncate" title={title || undefined}>
      {children}
    </div>
  );
}

export function DataTable<T>({
  data,
  columns,
  loading,
  emptyState,
  actionsColumn,
  skeletonConfig,
  fullWidthRow,
}: DataTableProps<T>) {
  const hasData = data.length > 0;
  const showEmptyState = !hasData && !loading;
  const tableLayoutClass = resolveTableLayoutClass();

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
        containerClassName="overflow-x-hidden"
      />
    );
  }

  return (
    <div className="min-w-0 rounded-md border">
      <Table className={cn(tableLayoutClass)} containerClassName="overflow-x-hidden">
        <DataTableColGroup columns={columns} actionsColumn={!!actionsColumn} />
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  shouldTruncateDataTableColumn(column) && 'min-w-0 overflow-hidden',
                  column.className
                )}
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
          {data.map((item, rowIndex) => {
            const fullWidthContent = fullWidthRow?.(item);
            if (fullWidthContent != null) {
              return (
                <TableRow key={rowIndex} className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={columns.length + (actionsColumn ? 1 : 0)} className="py-2">
                    {fullWidthContent}
                  </TableCell>
                </TableRow>
              );
            }

            return (
              <TableRow key={rowIndex}>
                {columns.map((column) => {
                  const truncate = shouldTruncateDataTableColumn(column);
                  const content = column.render(item);

                  return (
                    <TableCell
                      key={column.key}
                      className={cn(truncate && 'min-w-0 overflow-hidden', column.className)}
                      style={detailTableColumnStyle(column.width, resolveColumnWidthMode(column))}
                    >
                      <DataTableCellContent truncate={truncate}>{content}</DataTableCellContent>
                    </TableCell>
                  );
                })}
                {actionsColumn && (
                  <TableCell className="text-right">{actionsColumn.render(item)}</TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
