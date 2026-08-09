'use client';

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

type TableSkeletonColumnType =
  'avatar' | 'avatar-only' | 'text' | 'button' | 'list' | 'badge' | 'actions' | 'audit' | 'icon';

export interface TableSkeletonColumnConfig {
  key: string;
  type: TableSkeletonColumnType;
  width?: string;
  columnWidthMode?: DetailTableColumnWidthMode;
  className?: string;
}

export interface TableSkeletonProps {
  columns: TableSkeletonColumnConfig[];
  rowCount?: number;
  showActions?: boolean;
  className?: string;
}

function resolveColumnWidthMode(column: TableSkeletonColumnConfig): DetailTableColumnWidthMode {
  return column.columnWidthMode ?? 'fixed';
}

export function TableSkeleton({
  columns,
  rowCount = 5,
  showActions = false,
  className,
}: TableSkeletonProps) {
  const renderSkeletonCell = (column: TableSkeletonColumnConfig) => {
    switch (column.type) {
      case 'avatar':
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        );

      case 'avatar-only':
      case 'icon':
        return <div className="mx-auto size-6 rounded-full bg-muted animate-pulse" />;

      case 'text':
        return (
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
        );

      case 'button':
        return <div className="h-8 w-20 bg-muted rounded animate-pulse" />;

      case 'list':
        return (
          <div className="flex flex-wrap gap-1">
            <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
            <div className="h-5 w-14 bg-muted rounded animate-pulse" />
            <div className="h-5 w-18 bg-muted rounded animate-pulse" />
          </div>
        );

      case 'badge':
        return <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />;

      case 'actions':
        return (
          <div className="flex gap-1">
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          </div>
        );

      case 'audit':
        return (
          <div className="flex gap-1">
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          </div>
        );

      default:
        return <div className="h-4 w-20 bg-muted rounded animate-pulse" />;
    }
  };

  return (
    <div className="min-w-0 rounded-md border">
      <Table className={cn(className)}>
        <DataTableColGroup columns={columns} actionsColumn={showActions} />
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={column.className}
                style={detailTableColumnStyle(column.width, resolveColumnWidthMode(column))}
              >
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </TableHead>
            ))}
            {showActions && (
              <TableHead className="w-[100px]" style={detailTableColumnStyle('100px', 'fixed')}>
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={column.className}
                  style={detailTableColumnStyle(column.width, resolveColumnWidthMode(column))}
                >
                  {renderSkeletonCell(column)}
                </TableCell>
              ))}
              {showActions && (
                <TableCell>
                  <div className="flex gap-1">
                    <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
