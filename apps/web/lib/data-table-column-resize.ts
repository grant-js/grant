import type { DataTableColumnConfig } from '@/components/common/data-table';
import {
  DATA_TABLE_CHECKBOX_COLUMN_WIDTH,
  DATA_TABLE_ICON_COLUMN_WIDTH,
  DATA_TABLE_ICON_ONLY_COLUMN_WIDTH,
} from '@/lib/detail-table-column-width';

/** Default bounds for a user-set width; a column overrides them with `minWidth` / `maxWidth`. */
export const DATA_TABLE_COLUMN_MIN_WIDTH_PX = 64;
export const DATA_TABLE_COLUMN_MAX_WIDTH_PX = 640;

/** Keyboard step of a resize handle; Shift uses the large step. */
export const DATA_TABLE_RESIZE_STEP_PX = 16;
export const DATA_TABLE_RESIZE_LARGE_STEP_PX = 64;

const CHROME_COLUMN_WIDTHS = new Set([
  DATA_TABLE_CHECKBOX_COLUMN_WIDTH,
  DATA_TABLE_ICON_COLUMN_WIDTH,
  DATA_TABLE_ICON_ONLY_COLUMN_WIDTH,
]);

export interface DataTableColumnBounds {
  min: number;
  max: number;
}

type ResizeConfig = Pick<
  DataTableColumnConfig<unknown>,
  'header' | 'width' | 'columnWidthMode' | 'className' | 'enableResizing' | 'minWidth' | 'maxWidth'
>;

/** Chrome columns hold a checkbox, icon, avatar or button (an empty header): they are neither ellipsized nor resizable. */
export function isChromeDataTableColumn(
  column: Pick<ResizeConfig, 'width' | 'columnWidthMode' | 'className'> &
    Partial<Pick<ResizeConfig, 'header'>>
): boolean {
  // A column without header text holds a button, avatar or icon: chrome, never clipped.
  if (column.header !== undefined && column.header.trim() === '') return true;

  const { className } = column;
  if (
    className &&
    ((className.includes('w-10') && className.includes('min-w-10')) ||
      (className.includes('w-11') && className.includes('min-w-11')))
  ) {
    return true;
  }

  return (
    (column.columnWidthMode ?? 'fixed') === 'fixed' &&
    column.width !== undefined &&
    CHROME_COLUMN_WIDTHS.has(column.width)
  );
}

/**
 * `enableResizing` wins; otherwise a column resizes unless it is chrome or has no header text
 * (the handle needs a name to announce).
 */
export function isDataTableColumnResizable(column: ResizeConfig): boolean {
  if (column.enableResizing !== undefined) return column.enableResizing;
  return !isChromeDataTableColumn(column) && column.header.trim() !== '';
}

export function resolveColumnBounds(
  column: Pick<ResizeConfig, 'minWidth' | 'maxWidth'>
): DataTableColumnBounds {
  const min = column.minWidth ?? DATA_TABLE_COLUMN_MIN_WIDTH_PX;
  const max = column.maxWidth ?? DATA_TABLE_COLUMN_MAX_WIDTH_PX;
  return { min, max: Math.max(min, max) };
}

/** The one clamp for user widths: used by the handle, and by the state when it loads. */
export function clampColumnWidth(width: number, bounds: DataTableColumnBounds): number {
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(width)));
}

/** Pixels for a declared `px` / `rem` width; `undefined` for anything else (%, calc, ...). */
export function parseColumnWidthPx(width: string | undefined): number | undefined {
  const match = width?.trim().match(/^(\d+(?:\.\d+)?)(px|rem)$/);
  if (!match) return undefined;
  return Number(match[1]) * (match[2] === 'rem' ? 16 : 1);
}

/**
 * Horizontal padding of a data cell, header and body alike. The 8px resize handle sits inside the
 * right padding (12px), so it never overlaps the text. Chrome columns keep their own, compact one.
 */
export const DATA_TABLE_CELL_PADDING_CLASS = 'px-3';
const DATA_TABLE_CELL_HORIZONTAL_PADDING_PX = 24;
/** Spare pixel on top of the measured text, against rounding. */
const DATA_TABLE_FIT_SAFETY_PX = 1;

/**
 * Natural content width of an element that is normally boxed in (a truncate wrapper, a header
 * label): lets it grow to its content for a moment and reads its fractional rendered width (an integer `scrollWidth` can under-read by a sub-pixel and ellipsize the longest value). Runs synchronously,
 * so nothing is painted in between.
 */
export function measureFitContentWidth(element: HTMLElement): number {
  const { width, maxWidth } = element.style;
  element.style.width = 'max-content';
  element.style.maxWidth = 'none';
  const measured = Math.ceil(element.getBoundingClientRect().width);
  element.style.width = width;
  element.style.maxWidth = maxWidth;
  return measured;
}

/**
 * Default width of a column: its widest content plus the cell padding, within the column's
 * min/max. The declared width is not a cap: a wide table scrolls.
 */
export function fitColumnWidth(contentWidth: number, bounds: DataTableColumnBounds): number {
  const wanted =
    Math.ceil(contentWidth) + DATA_TABLE_FIT_SAFETY_PX + DATA_TABLE_CELL_HORIZONTAL_PADDING_PX;
  return clampColumnWidth(wanted, bounds);
}
