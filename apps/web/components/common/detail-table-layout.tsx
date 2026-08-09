import type { ReactNode } from 'react';

import type { DetailTableColumnWidthMode } from '@/lib/detail-table-column-width';

const LEADING_COLUMN_WIDTH = '2.5rem';
const ICON_ONLY_COLUMN_WIDTH = '2.75rem';

const CHECKBOX_COLUMN_CLASS = 'box-border w-10 min-w-10 max-w-10 py-2 pl-2 pr-0 align-middle';
const ICON_COLUMN_CLASS = 'box-border w-10 min-w-10 max-w-10 py-2 px-0 align-middle';
const ICON_ONLY_COLUMN_CLASS = 'box-border w-11 min-w-11 max-w-11 py-2 pl-2 pr-1 align-middle';

/** Read-only label column in entity detail info tables (field / value rows). */
export const DETAIL_INFO_FIELD_COLUMN_WIDTH = '160px';

/** Shared leading-column layout for entity detail relationship tables. */
export const DETAIL_CHECKBOX_COLUMN = {
  width: LEADING_COLUMN_WIDTH,
  className: CHECKBOX_COLUMN_CLASS,
  columnWidthMode: 'fixed' as const satisfies DetailTableColumnWidthMode,
} as const;

export const DETAIL_ICON_COLUMN = {
  width: LEADING_COLUMN_WIDTH,
  className: ICON_COLUMN_CLASS,
  columnWidthMode: 'fixed' as const satisfies DetailTableColumnWidthMode,
} as const;

/** First column for tables without a checkbox (general info, embedded API keys). */
export const DETAIL_ICON_ONLY_COLUMN = {
  width: ICON_ONLY_COLUMN_WIDTH,
  className: ICON_ONLY_COLUMN_CLASS,
  columnWidthMode: 'fixed' as const satisfies DetailTableColumnWidthMode,
} as const;

export const DETAIL_LOADING_COLUMN = {
  width: LEADING_COLUMN_WIDTH,
  className: ICON_COLUMN_CLASS,
  columnWidthMode: 'fixed' as const satisfies DetailTableColumnWidthMode,
} as const;

/** Text columns that may grow wider than their minimum width. */
export const DETAIL_TEXT_COLUMN = {
  columnWidthMode: 'min' as const satisfies DetailTableColumnWidthMode,
} as const;

export const DETAIL_CONTENT_COLUMN_CLASS = 'align-middle py-2 px-2';

/** First text column after checkbox + icon. */
export const DETAIL_PRIMARY_CONTENT_COLUMN_CLASS = 'align-middle py-2 pl-1 pr-2';

/** First text column after icon-only leading column (general info, embedded API keys). */
export const DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS = 'align-middle py-2 pl-2 pr-2';

export function DetailTableCheckboxCell({ children }: { children: ReactNode }) {
  return <div className="flex size-4 items-center justify-center">{children}</div>;
}

export function DetailTableIconCell({ children }: { children: ReactNode }) {
  return <div className="flex size-6 items-center justify-center">{children}</div>;
}

export const DETAIL_CHECKBOX_SKELETON = {
  key: 'checkbox',
  type: 'icon' as const,
  width: DETAIL_CHECKBOX_COLUMN.width,
  className: DETAIL_CHECKBOX_COLUMN.className,
  columnWidthMode: DETAIL_CHECKBOX_COLUMN.columnWidthMode,
};

export const DETAIL_ICON_SKELETON = {
  key: 'icon',
  type: 'avatar-only' as const,
  width: DETAIL_ICON_COLUMN.width,
  className: DETAIL_ICON_COLUMN.className,
  columnWidthMode: DETAIL_ICON_COLUMN.columnWidthMode,
};

const DETAIL_ICON_ONLY_SKELETON = {
  key: 'icon',
  type: 'avatar-only' as const,
  width: DETAIL_ICON_ONLY_COLUMN.width,
  className: DETAIL_ICON_ONLY_COLUMN.className,
  columnWidthMode: DETAIL_ICON_ONLY_COLUMN.columnWidthMode,
};

export const DETAIL_LOADING_SKELETON = {
  key: 'loading',
  type: 'icon' as const,
  width: DETAIL_LOADING_COLUMN.width,
  className: DETAIL_LOADING_COLUMN.className,
  columnWidthMode: DETAIL_LOADING_COLUMN.columnWidthMode,
};

/** @deprecated Use {@link DETAIL_CHECKBOX_COLUMN} from `@/components/common/detail-table-layout`. */
export const USER_DETAIL_CHECKBOX_COLUMN = DETAIL_CHECKBOX_COLUMN;
/** @deprecated Use {@link DETAIL_ICON_COLUMN}. */
export const USER_DETAIL_ICON_COLUMN = DETAIL_ICON_COLUMN;
/** @deprecated Use {@link DETAIL_ICON_ONLY_COLUMN}. */
export const USER_DETAIL_ICON_ONLY_COLUMN = DETAIL_ICON_ONLY_COLUMN;
/** @deprecated Use {@link DETAIL_LOADING_COLUMN}. */
export const USER_DETAIL_LOADING_COLUMN = DETAIL_LOADING_COLUMN;
/** @deprecated Use {@link DETAIL_TEXT_COLUMN}. */
export const USER_DETAIL_TEXT_COLUMN = DETAIL_TEXT_COLUMN;
/** @deprecated Use {@link DETAIL_CONTENT_COLUMN_CLASS}. */
export const USER_DETAIL_CONTENT_COLUMN_CLASS = DETAIL_CONTENT_COLUMN_CLASS;
/** @deprecated Use {@link DETAIL_PRIMARY_CONTENT_COLUMN_CLASS}. */
export const USER_DETAIL_PRIMARY_CONTENT_COLUMN_CLASS = DETAIL_PRIMARY_CONTENT_COLUMN_CLASS;
/** @deprecated Use {@link DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS}. */
export const USER_DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS =
  DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS;
/** @deprecated Use {@link DetailTableCheckboxCell}. */
export const UserDetailTableCheckboxCell = DetailTableCheckboxCell;
/** @deprecated Use {@link DetailTableIconCell}. */
export const UserDetailTableIconCell = DetailTableIconCell;
/** @deprecated Use {@link DETAIL_CHECKBOX_SKELETON}. */
export const USER_DETAIL_CHECKBOX_SKELETON = DETAIL_CHECKBOX_SKELETON;
/** @deprecated Use {@link DETAIL_ICON_SKELETON}. */
export const USER_DETAIL_ICON_SKELETON = DETAIL_ICON_SKELETON;
/** @deprecated Use {@link DETAIL_ICON_ONLY_SKELETON}. */
export const USER_DETAIL_ICON_ONLY_SKELETON = DETAIL_ICON_ONLY_SKELETON;
/** @deprecated Use {@link DETAIL_LOADING_SKELETON}. */
export const USER_DETAIL_LOADING_SKELETON = DETAIL_LOADING_SKELETON;
