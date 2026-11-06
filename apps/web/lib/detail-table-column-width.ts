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

/**
 * Chrome columns are exactly as wide as their control plus compact padding, one width per kind,
 * for every table. A caller's own width for such a column does not count.
 */
export const DATA_TABLE_CHECKBOX_COLUMN_WIDTH = '2.5rem';
export const DATA_TABLE_ICON_COLUMN_WIDTH = '2.5rem';
export const DATA_TABLE_ICON_ONLY_COLUMN_WIDTH = '2.75rem';
/** 32px avatar + 16px left + 8px right padding. */
export const DATA_TABLE_AVATAR_COLUMN_WIDTH = '56px';
/** 36px go-to-detail button + 8px padding a side. */
export const DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH = '52px';
/** 32px actions (⋮) button + 8px padding a side. */
export const DATA_TABLE_ACTIONS_COLUMN_WIDTH = '48px';

/**
 * Centred control columns that keep a header text (a switch or a check per row): exactly this
 * wide, not resizable, so the control stays centred under its label.
 */
export const DATA_TABLE_SWITCH_COLUMN_WIDTH = '96px';
export const DATA_TABLE_STATUS_COLUMN_WIDTH = '120px';

const CHROME_WIDTH_BY_COLUMN_KEY: Record<string, string> = {
  avatar: DATA_TABLE_AVATAR_COLUMN_WIDTH,
  navigation: DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH,
  open: DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH,
};

/** The shared width for an avatar / open-button column; any other column keeps its own. */
export function resolveChromeColumnWidth(key: string, width?: string): string | undefined {
  return CHROME_WIDTH_BY_COLUMN_KEY[key] ?? width;
}

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
