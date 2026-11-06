import type { CSSProperties } from 'react';

export type DetailTableColumnWidthMode = 'fixed' | 'min';

/** Applies a fixed width that table layout cannot shrink or grow. */
export function detailTableColumnStyle(
  width?: string,
  mode: DetailTableColumnWidthMode = 'fixed'
): CSSProperties | undefined {
  if (!width) return undefined;
  if (mode === 'fixed') {
    return { width, minWidth: width, maxWidth: width };
  }
  return { minWidth: width };
}

export function detailTableColWidth(width?: string): CSSProperties | undefined {
  if (!width) return undefined;
  return { width };
}

/** Floor for a column with no declared width, so it cannot collapse to nothing before the table scrolls. */
export const DATA_TABLE_UNSIZED_COLUMN_MIN_WIDTH = '8rem';

export const DATA_TABLE_ACTIONS_COLUMN_WIDTH = '100px';

/**
 * Minimum table width: the sum of the declared column widths, with unsized columns at
 * {@link DATA_TABLE_UNSIZED_COLUMN_MIN_WIDTH}. Below it the table container scrolls
 * horizontally instead of squeezing columns past their declared width.
 */
export function dataTableMinWidthStyle(
  columns: ReadonlyArray<{ width?: string }>,
  hasActionsColumn = false
): CSSProperties | undefined {
  const widths = columns.map((column) => column.width ?? DATA_TABLE_UNSIZED_COLUMN_MIN_WIDTH);
  if (hasActionsColumn) widths.push(DATA_TABLE_ACTIONS_COLUMN_WIDTH);
  if (widths.length === 0) return undefined;
  return { minWidth: widths.length === 1 ? widths[0] : `calc(${widths.join(' + ')})` };
}
