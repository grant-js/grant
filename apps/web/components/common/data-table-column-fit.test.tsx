// @vitest-environment jsdom

import { useState } from 'react';
import { type Account, AccountType } from '@grantjs/schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDataTableColumnState } from '@/hooks/common/use-data-table-column-state';
import { useAuthStore } from '@/stores/auth.store';

import { DataTable, type DataTableColumnConfig } from './data-table';
import { DETAIL_CHECKBOX_COLUMN } from './detail-table-layout';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    `${key}${values ? JSON.stringify(values) : ''}`,
}));

/** jsdom has no layout: a fit-content element is "8px per character" wide. */
const CHAR_PX = 8;
const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get');

type Row = { id: string; name: string };

const emptyState = { icon: <span />, title: 'Empty', description: 'None' };
const STORAGE_KEY = 'grant:table:v1:u1:fit.test';

function columns(): DataTableColumnConfig<Row>[] {
  return [
    { key: 'select', header: '', ...DETAIL_CHECKBOX_COLUMN, render: () => null },
    { key: 'name', header: 'Name', width: '200px', render: (row) => row.name },
    { key: 'code', header: 'Code', width: '60px', minWidth: 48, render: (row) => row.id },
    { key: 'flex', header: 'Flex', width: '120px', columnWidthMode: 'min', render: () => 'x' },
  ];
}

function Harness({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const { visibleColumns, resetColumns } = useDataTableColumnState(columns(), {
    tableId: 'fit.test',
  });
  return (
    <>
      <button type="button" onClick={resetColumns}>
        reset
      </button>
      <button
        type="button"
        onClick={() => setRows([{ id: 'r9', name: 'A very long replacement name' }])}
      >
        change data
      </button>
      <DataTable
        tableId="fit.test"
        data={rows}
        columns={visibleColumns}
        loading={false}
        emptyState={emptyState}
      />
    </>
  );
}

function colWidths(container: HTMLElement) {
  return Array.from(container.querySelectorAll('colgroup > col')).map((col) =>
    col instanceof HTMLElement ? col.style.width : ''
  );
}

function setUser(userId: string | null) {
  useAuthStore.setState({
    accounts:
      userId === null
        ? []
        : ([
            { id: `acc-${userId}`, type: AccountType.Personal, ownerId: userId },
          ] as unknown as Account[]),
  });
}

const rows: Row[] = [
  { id: 'r1', name: 'Short' }, // 5 chars
  { id: 'r2', name: 'Twelve chars' }, // 12 chars, the longest in "name"
];

describe('DataTable cell padding', () => {
  beforeEach(() => scrollWidth.mockReturnValue(0));

  it('pads data header and body cells on both sides, and leaves chrome cells compact', () => {
    const { container } = render(
      <DataTable
        tableId="pad.test"
        data={[{ id: 'r1', name: 'Short' }]}
        columns={columns()}
        loading={false}
        emptyState={emptyState}
      />
    );
    const headers = container.querySelectorAll('th');
    const cells = container.querySelectorAll('td');
    for (const index of [1, 2]) {
      expect(headers[index]).toHaveClass('px-3');
      expect(cells[index]).toHaveClass('px-3');
    }
    expect(headers[0]).not.toHaveClass('px-3');
    expect(cells[0]).not.toHaveClass('px-3');
    expect(cells[0]).toHaveClass('pr-0');
  });
});

describe('DataTable default width fits the content', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setUser('u1');
    scrollWidth.mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-fit-content') ? (this.textContent ?? '').length * CHAR_PX : 0;
    });
  });
  afterEach(() => setUser(null));

  it('fits to the widest content plus padding, clamped to min and to the declared width', () => {
    const { container } = render(<Harness initialRows={rows} />);
    // name: 12 chars = 96 + 24 padding = 120 (below the declared 200). code: "Code"/"r1" = 32 + 24
    // = 56 (above min 48, below 60). flex shares leftover space: not fitted.
    expect(colWidths(container)).toEqual(['2.5rem', '120px', '56px', '120px']);
    const handles = screen.getAllByRole('separator');
    expect(handles[0]).toHaveAttribute('aria-valuenow', '120');
    expect(handles[1]).toHaveAttribute('aria-valuenow', '56');
  });

  it('never exceeds the declared width, and never goes below min', () => {
    const wide: Row[] = [{ id: 'x', name: 'N'.repeat(100) }];
    scrollWidth.mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-fit-content') && this.dataset.columnKey === 'code'
        ? 4
        : this.hasAttribute('data-fit-content')
          ? (this.textContent ?? '').length * CHAR_PX
          : 0;
    });
    const { container } = render(<Harness initialRows={wide} />);
    // name capped at 200; code (4 + 24 = 28) raised to its min 48.
    expect(colWidths(container).slice(1, 3)).toEqual(['200px', '48px']);
  });

  it('does not re-measure when the data changes', () => {
    const { container } = render(<Harness initialRows={rows} />);
    expect(colWidths(container)[1]).toBe('120px');
    fireEvent.click(screen.getByText('change data'));
    expect(screen.getByText('A very long replacement name')).toBeInTheDocument();
    expect(colWidths(container)[1]).toBe('120px');
  });

  it('a user width wins and is saved; the fitted width is not', () => {
    const { container } = render(<Harness initialRows={rows} />);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    fireEvent.keyDown(screen.getAllByRole('separator')[0], { key: 'ArrowRight' });

    expect(colWidths(container)[1]).toBe('136px');
    expect(screen.getAllByRole('separator')[0]).toHaveAttribute('aria-valuenow', '136');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').widths).toEqual({
      name: 136,
    });
  });

  it('Reset columns re-measures the columns that had a user width', () => {
    const { container } = render(<Harness initialRows={rows} />);
    fireEvent.keyDown(screen.getAllByRole('separator')[0], { key: 'End' });
    expect(colWidths(container)[1]).toBe('640px');

    // The content grew in the meantime; a reset fits to what is there now.
    scrollWidth.mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-fit-content') ? 20 * CHAR_PX : 0;
    });
    fireEvent.click(screen.getByText('reset'));

    expect(colWidths(container)[1]).toBe('184px');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps the declared width for the loading skeleton', () => {
    const { container } = render(
      <DataTable tableId="fit.test" data={[]} columns={columns()} loading emptyState={emptyState} />
    );
    expect(container.querySelector('[data-slot="table"]')?.getAttribute('style')).toContain(
      '200px'
    );
  });
});

describe('DataTable filler column', () => {
  beforeEach(() => scrollWidth.mockReturnValue(0));

  const sized: DataTableColumnConfig<Row>[] = [
    { key: 'name', header: 'Name', width: '93px', render: (row) => row.name },
    { key: 'code', header: 'Code', width: '60px', render: (row) => row.id },
  ];

  it('adds an empty, hidden, trailing column that takes the slack', () => {
    const { container } = render(
      <DataTable
        tableId="filler.test"
        data={[{ id: 'r1', name: 'Short' }]}
        columns={sized}
        loading={false}
        emptyState={emptyState}
        actionsColumn={{ render: () => <button type="button">Open</button> }}
      />
    );
    const cols = container.querySelectorAll('colgroup > col');
    expect(cols).toHaveLength(4);
    expect(cols[3]).toHaveAttribute('aria-hidden', 'true');
    expect((cols[3] as HTMLElement).style.width).toBe('');
    // Real columns keep their exact state width.
    expect(
      Array.from(cols)
        .slice(0, 2)
        .map((col) => (col as HTMLElement).style.width)
    ).toEqual(['93px', '60px']);
    const headerCells = container.querySelectorAll('th');
    expect(headerCells).toHaveLength(4);
    expect(headerCells[3]).toHaveAttribute('aria-hidden', 'true');
    expect(headerCells[3]).toHaveTextContent('');
    expect(container.querySelectorAll('tbody td')).toHaveLength(4);
    // Not resizable and not a picker item: no handle on the filler.
    expect(container.querySelector('th[aria-hidden] [role="separator"]')).toBeNull();
  });

  it('is left out when a column shares leftover space itself', () => {
    const { container } = render(
      <DataTable
        tableId="filler.test"
        data={[{ id: 'r1', name: 'Short' }]}
        columns={[
          ...sized,
          { key: 'rest', header: 'Rest', columnWidthMode: 'min', render: () => 'x' },
        ]}
        loading={false}
        emptyState={emptyState}
      />
    );
    expect(container.querySelector('[data-column-filler]')).toBeNull();
  });

  it('spans every column, filler included, on a full-width row', () => {
    const { container } = render(
      <DataTable
        tableId="filler.test"
        data={[{ id: 'g1', name: 'Group' }]}
        columns={sized}
        loading={false}
        emptyState={emptyState}
        actionsColumn={{ render: () => null }}
        fullWidthRow={(row) => <strong>{row.name}</strong>}
      />
    );
    expect(container.querySelector('tbody td')).toHaveAttribute('colspan', '4');
  });
});
