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
