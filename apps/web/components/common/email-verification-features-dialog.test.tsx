// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DATA_TABLE_STATUS_COLUMN_WIDTH } from '@/lib/detail-table-column-width';

import { EmailVerificationFeaturesDialog } from './email-verification-features-dialog';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
  this: HTMLElement
) {
  return {
    width: this.hasAttribute('data-fit-content') ? (this.textContent ?? '').length * 8 : 0,
  } as DOMRect;
});

describe('EmailVerificationFeaturesDialog', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders each feature group as a DataTable: feature column fits, check columns fixed', () => {
    render(<EmailVerificationFeaturesDialog />);
    fireEvent.click(screen.getByRole('button'));
    const dialog = screen.getByRole('dialog');

    const tables = dialog.querySelectorAll('[data-table-id="emailVerification.features"]');
    expect(tables.length).toBeGreaterThan(1);
    expect(dialog.querySelectorAll('table')).toHaveLength(tables.length);

    const first = tables[0] as HTMLElement;
    const widths = Array.from(first.querySelectorAll('colgroup > col')).map((col) =>
      col instanceof HTMLElement ? col.style.width : ''
    );
    // "features.createProject" (22 chars) fits at 22 * 8 + 1 + 24, well under the 160px fallback
    // it would otherwise keep or the old 50% share; the check columns are exact.
    expect(widths.slice(1, 3)).toEqual([
      DATA_TABLE_STATUS_COLUMN_WIDTH,
      DATA_TABLE_STATUS_COLUMN_WIDTH,
    ]);
    expect(widths[0]).toMatch(/^\d+px$/);
    // Only the feature column has a resize handle.
    expect(within(first).getAllByRole('separator')).toHaveLength(1);
  });
});
