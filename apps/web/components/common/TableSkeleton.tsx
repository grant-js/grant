'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type ColumnType =
  | 'avatar'
  | 'avatar-only'
  | 'text'
  | 'button'
  | 'list'
  | 'actions'
  | 'audit';

export interface ColumnConfig {
  key: string;
  type: ColumnType;
  width?: string;
}

export interface TableSkeletonProps {
  /**
   * Configuration for each column including type and optional width
   */
  columns: ColumnConfig[];
  /**
   * Number of skeleton rows to render
   * @default 5
   */
  rowCount?: number;
  /**
   * Whether to show an actions column
   * @default false
   */
  showActions?: boolean;
  /**
   * Additional CSS classes to apply to the table
   */
  className?: string;
}

export function TableSkeleton({
  columns,
  rowCount = 5,
  showActions = false,
  className,
}: TableSkeletonProps) {
  const renderSkeletonCell = (column: ColumnConfig) => {
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
        return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;

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
    <div className="w-full px-4">
      <div className="space-y-4">
        <div className="w-full">
          <Table className={className}>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.width}>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </TableHead>
                ))}
                {showActions && (
                  <TableHead className="w-[100px]">
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rowCount }, (_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.width}>
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
      </div>
    </div>
  );
}
