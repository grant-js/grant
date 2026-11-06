'use client';

import {
  isValidElement,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

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
  DATA_TABLE_CELL_PADDING_CLASS,
  fitColumnWidth,
  isChromeDataTableColumn,
  isDataTableColumnResizable,
  measureFitContentWidth,
  parseColumnWidthPx,
  resolveColumnBounds,
  shrinkFittedWidths,
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
  /**
   * Default width. A width the user set by resizing takes its place, within min/max. For a
   * resizable, truncating column it is also the cap of the fitted default: the column starts as
   * wide as its longest content, but never wider than this.
   */
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

/**
 * A user width makes the column fixed at that width, then a width fitted to the content (a
 * default, never saved); otherwise the declared layout stands.
 */
function resolveColumnLayout<T>(
  column: DataTableColumnConfig<T>,
  fittedWidth?: number
): {
  width?: string;
  mode: DetailTableColumnWidthMode;
} {
  const userWidth = column.resize?.width;
  if (userWidth !== undefined && isDataTableColumnResizable(column)) {
    return { width: `${userWidth}px`, mode: 'fixed' };
  }
  if (fittedWidth !== undefined) {
    return { width: `${fittedWidth}px`, mode: 'fixed' };
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

/** An empty-header column (button, avatar, icon) is chrome: compact padding, no wrapper, no clip. */
function isEmptyHeaderColumn<T>(column: DataTableColumnConfig<T>): boolean {
  return column.header.trim() === '';
}

/**
 * Columns whose default width is fitted to their content: resizable, truncating, declared in px
 * (fixed or min mode).
 */
function isFittableColumn<T>(column: DataTableColumnConfig<T>): boolean {
  return (
    isDataTableColumnResizable(column) &&
    shouldTruncateDataTableColumn(column) &&
    parseColumnWidthPx(column.width) !== undefined
  );
}

/** Empty-header, non-truncating columns only grow, to at least their content (never clipped). */
function isGrowColumn<T>(column: DataTableColumnConfig<T>): boolean {
  return (
    isEmptyHeaderColumn(column) &&
    column.truncate !== true &&
    parseColumnWidthPx(column.width) !== undefined
  );
}

/** Data columns get the shared horizontal padding; chrome columns keep their compact one. */
function dataCellPaddingClass<T>(column: DataTableColumnConfig<T>): string | undefined {
  return isChromeDataTableColumn(column) ? undefined : DATA_TABLE_CELL_PADDING_CLASS;
}

/**
 * Fitted widths can exceed a column's declared width. When the columns together are wider than
 * the container, those columns shrink back toward the declared width (proportionally, never below
 * it); only what is still too wide scrolls.
 */
function shrinkLayouts<T>(
  columns: DataTableColumnConfig<T>[],
  layouts: { width?: string; mode: DetailTableColumnWidthMode }[],
  fitted: Record<string, number>,
  containerWidth: number,
  hasActionsColumn: boolean
) {
  const items: { width: number; floor: number }[] = [];
  for (let index = 0; index < columns.length; index++) {
    const column = columns[index];
    const width = parseColumnWidthPx(layouts[index].width);
    if (width === undefined) {
      // A column with no width of its own counts at its floor; %/calc widths cannot be summed.
      if (layouts[index].width !== undefined) return layouts;
      items.push({ width: 128, floor: 128 });
      continue;
    }
    const isFitted = column.resize?.width === undefined && fitted[column.key] !== undefined;
    const declared = parseColumnWidthPx(column.width) ?? width;
    items.push({ width, floor: isFitted ? Math.min(width, declared) : width });
  }

  const shrunk = shrinkFittedWidths(items, containerWidth, hasActionsColumn ? 100 : 0);
  return layouts.map((layout, index) =>
    shrunk[index] === items[index].width ? layout : { ...layout, width: `${shrunk[index]}px` }
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

function DataTableCellContent({
  children,
  truncate,
  columnKey,
}: {
  children: ReactNode;
  truncate: boolean;
  columnKey: string;
}) {
  if (!truncate) {
    return children;
  }

  const title = textFromReactNode(children).trim();

  return (
    <div
      className="min-w-0 max-w-full truncate"
      title={title || undefined}
      data-fit-content
      data-column-key={columnKey}
    >
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
  const rootRef = useRef<HTMLDivElement>(null);
  // Widths fitted to the content, per column key. Measured once per table mount (and again for a
  // column whose user width was reset); never saved.
  const [fitted, setFitted] = useState<Record<string, number>>({});
  const [containerWidth, setContainerWidth] = useState(0);
  const measuredKeys = useRef<Set<string>>(new Set());
  const previousUserWidths = useRef<Record<string, number | undefined>>({});
  const pendingRemeasure = useRef<Set<string>>(new Set());
  const remeasureAll = useRef(false);
  const [, setFontsEpoch] = useState(0);

  // A webfont that swaps in after the first measure widens the text: measure once more then.
  useEffect(() => {
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts || fonts.status === 'loaded') return;
    let active = true;
    void fonts.ready.then(() => {
      if (!active) return;
      remeasureAll.current = true;
      setFontsEpoch((epoch) => epoch + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    for (const column of columns) {
      const previous = previousUserWidths.current[column.key];
      if (previous !== undefined && column.resize?.width === undefined) {
        pendingRemeasure.current.add(column.key);
      }
      previousUserWidths.current[column.key] = column.resize?.width;
    }

    const root = rootRef.current;
    if (!root || loading || !hasData) return;
    if (remeasureAll.current) {
      remeasureAll.current = false;
      for (const column of columns) pendingRemeasure.current.add(column.key);
    }

    const width = root.clientWidth;
    setContainerWidth((current) => (current === width ? current : width));

    const toMeasure = columns.filter(
      (column) =>
        (isFittableColumn(column) || isGrowColumn(column)) &&
        column.resize?.width === undefined &&
        (!measuredKeys.current.has(column.key) || pendingRemeasure.current.has(column.key))
    );
    if (toMeasure.length === 0) return;

    const contentWidths = new Map<string, number>();
    root.querySelectorAll<HTMLElement>('[data-fit-content]').forEach((element) => {
      const key = element.dataset.columnKey;
      if (key === undefined) return;
      contentWidths.set(
        key,
        Math.max(contentWidths.get(key) ?? 0, measureFitContentWidth(element))
      );
    });
    // Cells without a wrapper: a width past the cell's box is content that would be cut.
    const overflowWidths = new Map<string, number>();
    root.querySelectorAll<HTMLElement>('td[data-column-key]').forEach((cell) => {
      const key = cell.dataset.columnKey as string;
      const seen = overflowWidths.get(key) ?? 0;
      overflowWidths.set(
        key,
        Math.max(seen, cell.scrollWidth > cell.clientWidth ? cell.scrollWidth + 1 : 0)
      );
    });

    const next: Record<string, number> = {};
    for (const column of toMeasure) {
      pendingRemeasure.current.delete(column.key);
      if (isGrowColumn(column)) {
        if (!overflowWidths.has(column.key)) continue;
        measuredKeys.current.add(column.key);
        const declared = parseColumnWidthPx(column.width) as number;
        const needed = Math.ceil(overflowWidths.get(column.key) as number);
        if (needed > declared) next[column.key] = needed;
        continue;
      }
      const content = contentWidths.get(column.key);
      if (!content) continue;
      measuredKeys.current.add(column.key);
      next[column.key] = fitColumnWidth(content, resolveColumnBounds(column));
    }
    if (Object.keys(next).length > 0) setFitted((current) => ({ ...current, ...next }));
  });

  // Keep the container width current when the page or sidebar resizes.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const width = root.clientWidth;
      setContainerWidth((current) => (current === width ? current : width));
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [loading, hasData]);

  const declaredLayouts = columns.map((column) => resolveColumnLayout(column));
  const fittedLayouts = columns.map((column) => resolveColumnLayout(column, fitted[column.key]));
  const layouts = shrinkLayouts(columns, fittedLayouts, fitted, containerWidth, !!actionsColumn);
  // Slack goes to an empty trailing column so real columns keep their exact width: with every
  // column sized, a fixed table layout would otherwise spread it over all of them. Not when a
  // column has no width at all, which then takes the leftover space by design.
  const showFiller = layouts.every((layout) => layout.width !== undefined);

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
        width: declaredLayouts[index].width,
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
    <div ref={rootRef} className="min-w-0 rounded-md border" data-table-id={tableId}>
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
          filler={showFiller}
        />
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead
                key={column.key}
                className={cn(
                  shouldTruncateDataTableColumn(column) && 'min-w-0 overflow-hidden',
                  column.resize && isDataTableColumnResizable(column) && 'relative',
                  column.className,
                  dataCellPaddingClass(column)
                )}
                data-column-key={column.key}
                style={detailTableColumnStyle(layouts[index].width, layouts[index].mode)}
              >
                {isFittableColumn(column) ? (
                  <span data-fit-content data-column-key={column.key} className="inline-block">
                    {column.header}
                  </span>
                ) : (
                  column.header
                )}
                {column.resize && isDataTableColumnResizable(column) && (
                  <DataTableColumnResizeHandle
                    label={column.header}
                    width={
                      column.resize.width ??
                      (fitted[column.key] !== undefined
                        ? parseColumnWidthPx(layouts[index].width)
                        : undefined)
                    }
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
            {showFiller && <TableHead aria-hidden data-column-filler className="p-0" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, rowIndex) => {
            const fullWidthContent = fullWidthRow?.(item);
            if (fullWidthContent != null) {
              return (
                <TableRow key={rowIndex} className="bg-muted/40 hover:bg-muted/40">
                  <TableCell
                    colSpan={columns.length + (actionsColumn ? 1 : 0) + (showFiller ? 1 : 0)}
                    className="py-2"
                  >
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
                      className={cn(
                        truncate && 'min-w-0 overflow-hidden',
                        column.className,
                        dataCellPaddingClass(column)
                      )}
                      data-column-key={column.key}
                      style={detailTableColumnStyle(layouts[index].width, layouts[index].mode)}
                    >
                      <DataTableCellContent truncate={truncate} columnKey={column.key}>
                        {content}
                      </DataTableCellContent>
                    </TableCell>
                  );
                })}
                {actionsColumn && (
                  <TableCell className="text-right">{actionsColumn.render(item)}</TableCell>
                )}
                {showFiller && <TableCell aria-hidden data-column-filler className="p-0" />}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
