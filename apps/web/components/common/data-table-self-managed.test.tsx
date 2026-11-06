// @vitest-environment jsdom

import { type Account, AccountType } from '@grantjs/schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH } from '@/lib/detail-table-column-width';
import { useAuthStore } from '@/stores/auth.store';

import { DataTable, type DataTableColumnConfig } from './data-table';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const rectWidth = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');

type Row = { id: string; name: string };
const columns: DataTableColumnConfig<Row>[] = [
  { key: 'name', header: 'Name', width: '200px', render: (row) => row.name },
  { key: 'navigation', header: '', width: '10px', render: () => 'go' },
];

function renderTable() {
  return render(
    <DataTable
      tableId="plain.list"
      data={[{ id: '1', name: 'Twelve chars' }]}
      columns={columns}
      loading={false}
      emptyState={{ icon: <span />, title: 'Empty', description: 'None' }}
    />
  );
}

/** A caller that keeps no column state (no picker) still gets handles, fitting and the filler. */
describe('DataTable without a column picker', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({
      accounts: [{ id: 'a', type: AccountType.Personal, ownerId: 'u1' }] as unknown as Account[],
    });
    rectWidth.mockImplementation(function (this: HTMLElement) {
      return {
        width: this.hasAttribute('data-fit-content') ? (this.textContent ?? '').length * 8 : 0,
      } as DOMRect;
    });
  });
  afterEach(() => {
    rectWidth.mockReset();
    useAuthStore.setState({ accounts: [] });
  });

  it('resizes data columns, fits them, keeps chrome exact and ends with the filler', () => {
    const { container } = renderTable();
    const widths = Array.from(container.querySelectorAll('colgroup > col')).map((col) =>
      col instanceof HTMLElement ? col.style.width : ''
    );
    // 12 chars * 8 = 96 + 1 + 24 = 121; the open button column is the shared width; filler last.
    expect(widths).toEqual(['121px', DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH, '']);
    expect(screen.getAllByRole('separator')).toHaveLength(1);
  });

  it('saves a resized width per user and table', () => {
    renderTable();
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowRight' });
    expect(
      JSON.parse(window.localStorage.getItem('grant:table:v1:u1:plain.list') ?? '{}').widths
    ).toEqual({ name: 137 });
  });

  it('centres a column header label wrapper and its cell content together', () => {
    const centred: DataTableColumnConfig<Row>[] = [
      { key: 'name', header: 'Name', width: '200px', render: (row) => row.name },
      {
        key: 'flag',
        header: 'Flag',
        width: '96px',
        align: 'center',
        truncate: false,
        enableResizing: false,
        render: () => <i data-testid="mark" />,
      },
      { key: 'wide', header: 'Wide', width: '120px', align: 'center', render: (row) => row.id },
    ];
    const { container } = render(
      <DataTable
        tableId="centred.list"
        data={[{ id: '1', name: 'Twelve chars' }]}
        columns={centred}
        loading={false}
        emptyState={{ icon: <span />, title: 'Empty', description: 'None' }}
      />
    );
    for (const key of ['flag', 'wide']) {
      expect(container.querySelector(`th[data-column-key="${key}"]`)).toHaveClass('text-center');
      expect(container.querySelector(`td[data-column-key="${key}"]`)).toHaveClass('text-center');
    }
    expect(container.querySelector('th[data-column-key="name"]')).not.toHaveClass('text-center');
    // The fitted, resizable header's label wrapper sits inside the centred th.
    expect(container.querySelector('th[data-column-key="wide"] [data-fit-content]')).toHaveClass(
      'inline-block'
    );
    // A non-clipped cell's content is centred by the table, not by the caller.
    expect(screen.getByTestId('mark').parentElement).toHaveClass('flex', 'justify-center');
  });
});
