// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DATA_TABLE_ICON_ONLY_COLUMN_WIDTH } from '@/lib/detail-table-column-width';

import { EntityDetailInfoTable } from './entity-detail-info-table';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const CHAR_PX = 8;
const rectWidth = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');

const rows = [
  { id: 'a', icon: <span />, label: 'ID', value: <span>some-value</span> },
  { id: 'b', icon: <span />, label: 'Updated at', value: <button type="button">Copy</button> },
];

function colWidths(container: HTMLElement) {
  return Array.from(container.querySelectorAll('colgroup > col')).map((col) =>
    col instanceof HTMLElement ? col.style.width : ''
  );
}

describe('EntityDetailInfoTable', () => {
  beforeEach(() => {
    window.localStorage.clear();
    rectWidth.mockImplementation(function (this: HTMLElement) {
      return {
        width: this.hasAttribute('data-fit-content')
          ? (this.textContent ?? '').length * CHAR_PX
          : 0,
      } as DOMRect;
    });
  });
  afterEach(() => rectWidth.mockReset());

  it('renders through DataTable: resize handles on field and value, none on the icon column', () => {
    const { container } = render(
      <EntityDetailInfoTable rows={rows} fieldColumnHeader="Field" valueColumnHeader="Value" />
    );
    expect(container.querySelector('[data-table-id="entity.info"]')).toBeInTheDocument();
    const handleColumns = screen
      .getAllByRole('separator')
      .map((handle) => handle.closest('th')?.getAttribute('data-column-key'));
    expect(handleColumns).toEqual(['field', 'value']);
  });

  it('keeps the icon column at its exact shared width and fits the field column to its content', () => {
    const { container } = render(
      <EntityDetailInfoTable rows={rows} fieldColumnHeader="Field" valueColumnHeader="Value" />
    );
    const [icon, field, value, filler] = colWidths(container);
    expect(icon).toBe(DATA_TABLE_ICON_ONLY_COLUMN_WIDTH);
    // widest field text "Updated at" = 10 chars * 8 = 80, +1 safety +24 padding = 105, not 160.
    expect(field).toBe('105px');
    // value: widest cell "some-value" = 80 -> 105 as well ("Copy"/"Value" are shorter).
    expect(value).toBe('105px');
    expect(filler).toBe('');
  });

  it('scopes the saved widths by the given tableId and keeps the value wrapping', () => {
    const { container } = render(
      <EntityDetailInfoTable
        tableId="user.info"
        rows={rows}
        fieldColumnHeader="Field"
        valueColumnHeader="Value"
      />
    );
    expect(container.querySelector('[data-table-id="user.info"]')).toBeInTheDocument();
    expect(container.querySelector('td[data-column-key="value"]')).toHaveClass('whitespace-normal');
  });

  it('renders nothing without rows', () => {
    const { container } = render(
      <EntityDetailInfoTable rows={[]} fieldColumnHeader="Field" valueColumnHeader="Value" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
