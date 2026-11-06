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
  isChromeDataTableColumn,
  isDataTableColumnResizable,
  parseColumnWidthPx,
  resolveColumnBounds,
} from '@/lib/data-table-column-resize';
import {
  DATA_TABLE_ACTIONS_COLUMN_WIDTH,
  dataTableMinWidthStyle,
  detailTableColumnStyle,
  type DetailTableColumnWidthMode,
} from '@/lib/detail-table-column-width';
import { cn } from '@/lib/utils';

import { DataTableColumnResizeHandle } from './data-table-column-resize-handle';
import { EmptyState, type EmptyStateProps } from './empty-state';
import { TableSkeleton, TableSkeletonColumnConfig } from './table-skeleton';

export interface DataTableColumnConfig<T> {
  key: string;
  header: string;
  /** Default width. A width the user set by resizing takes its place, within min/max. */
  width?: string;
  /** Smallest width in px the user can resize to. Default 64. */
  minWidth?: number;
  /** Largest width in px the user can resize to. Default 640. */
  maxWidth?: number;
  /**
   * Whether the header shows a resize handle. Default: on, except for chrome columns (checkbox,
   * icon, avatar) and columns without a header text.
   */
  enableResizing?: boolean;
  /** Set by `useDataTableColumnState`: the user's width and how to change it. Do not set by hand. */
  resize?: {
    width?: number;
    onChange: (key: string, width: number | null) => void;
  };
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
  /** Stable id, unique across the app (e.g. `users.list`); scopes the saved column state. */
  tableId: string;
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

/** A user width makes the column fixed at that width; otherwise the declared layout stands. */
function resolveColumnLayout<T>(column: DataTableColumnConfig<T>): {
  width?: string;
  mode: DetailTableColumnWidthMode;
} {
  const userWidth = column.resize?.width;
  if (userWidth !== undefined && isDataTableColumnResizable(column)) {
    return { width: `${userWidth}px`, mode: 'fixed' };
  }
  return { width: column.width, mode: resolveColumnWidthMode(column) };
}

function shouldTruncateDataTableColumn<T>(column: DataTableColumnConfig<T>): boolean {
  if (column.truncate === false) {
    return false;
  }

  if (column.truncate === true) {
    return true;
  }

  return !isChromeDataTableColumn(column);
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
  tableId,
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
  const layouts = columns.map(resolveColumnLayout);

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
      columns.map((column, index) => ({
        key: column.key,
        type: 'text',
        width: layouts[index].width,
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
    <div className="min-w-0 rounded-md border" data-table-id={tableId}>
      <Table
        className={cn(tableLayoutClass)}
        style={dataTableMinWidthStyle(
          columns.map((column, index) => ({ width: layouts[index].width })),
          !!actionsColumn
        )}
      >
        <DataTableColGroup
          columns={columns.map((column, index) => ({
            key: column.key,
            width: layouts[index].width,
          }))}
          actionsColumn={!!actionsColumn}
        />
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead
                key={column.key}
                className={cn(
                  shouldTruncateDataTableColumn(column) && 'min-w-0 overflow-hidden',
                  column.resize && isDataTableColumnResizable(column) && 'relative',
                  column.className
                )}
                style={detailTableColumnStyle(layouts[index].width, layouts[index].mode)}
              >
                {column.header}
                {column.resize && isDataTableColumnResizable(column) && (
                  <DataTableColumnResizeHandle
                    label={column.header}
                    width={column.resize.width}
                    defaultWidth={parseColumnWidthPx(column.width)}
                    bounds={resolveColumnBounds(column)}
                    onResize={(width) => column.resize?.onChange(column.key, width)}
                    onReset={() => column.resize?.onChange(column.key, null)}
                  />
                )}
              </TableHead>
            ))}
            {actionsColumn && (
              <TableHead
                className="w-[100px]"
                style={detailTableColumnStyle(DATA_TABLE_ACTIONS_COLUMN_WIDTH, 'fixed')}
              />
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
                {columns.map((column, index) => {
                  const truncate = shouldTruncateDataTableColumn(column);
                  const content = column.render(item);

                  return (
                    <TableCell
                      key={column.key}
                      className={cn(truncate && 'min-w-0 overflow-hidden', column.className)}
                      style={detailTableColumnStyle(layouts[index].width, layouts[index].mode)}
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
