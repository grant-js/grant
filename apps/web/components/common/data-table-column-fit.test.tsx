// @vitest-environment jsdom

import { useState } from 'react';
import { type Account, AccountType } from '@grantjs/schema';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDataTableColumnState } from '@/hooks/common/use-data-table-column-state';
import {
  DATA_TABLE_ACTIONS_COLUMN_WIDTH,
  DATA_TABLE_AVATAR_COLUMN_WIDTH,
  DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH,
} from '@/lib/detail-table-column-width';
import { useAuthStore } from '@/stores/auth.store';

import { DataTable, type DataTableColumnConfig } from './data-table';
import { DETAIL_CHECKBOX_COLUMN } from './detail-table-layout';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    `${key}${values ? JSON.stringify(values) : ''}`,
}));

/** jsdom has no layout: a fit-content element is "8px per character" wide (rect width). */
const CHAR_PX = 8;
const rectWidth = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
const clientWidth = vi.spyOn(Element.prototype, 'clientWidth', 'get');
const scrollWidth = vi.spyOn(Element.prototype, 'scrollWidth', 'get');
const rect = (width: number) => ({ width }) as DOMRect;

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
  beforeEach(() => rectWidth.mockReturnValue(rect(0)));

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
    clientWidth.mockReturnValue(0);
    scrollWidth.mockReturnValue(0);
    rectWidth.mockImplementation(function (this: HTMLElement) {
      return rect(
        this.hasAttribute('data-fit-content') ? (this.textContent ?? '').length * CHAR_PX : 0
      );
    });
  });
  afterEach(() => setUser(null));

  it('fits to the widest content plus padding, clamped to min and to the declared width', () => {
    const { container } = render(<Harness initialRows={rows} />);
    // name: 12 chars = 96 + 1 safety + 24 padding = 121 (below the declared 200). code: 32 + 25
    // = 57 (above min 48, below 60). flex (min mode) is fitted too: 57 raised to the default min
    // 64. The trailing filler has no width.
    expect(colWidths(container)).toEqual(['2.5rem', '121px', '57px', '64px', '']);
    const handles = screen.getAllByRole('separator');
    expect(handles[0]).toHaveAttribute('aria-valuenow', '121');
    expect(handles[1]).toHaveAttribute('aria-valuenow', '57');
  });

  it('is capped by maxWidth, not by the declared width, and never goes below min', () => {
    const wide: Row[] = [{ id: 'x', name: 'N'.repeat(100) }];
    rectWidth.mockImplementation(function (this: HTMLElement) {
      if (!this.hasAttribute('data-fit-content')) return rect(0);
      return rect(
        this.dataset.columnKey === 'code' ? 4 : (this.textContent ?? '').length * CHAR_PX
      );
    });
    const { container } = render(<Harness initialRows={wide} />);
    // name: 100 chars is past the declared 200 and capped at the default max 640; code (4 + 24 = 28) raised to its min 48.
    expect(colWidths(container).slice(1, 3)).toEqual(['640px', '48px']);
  });

  it('rounds a fractional content width up so the longest cell is not ellipsized', () => {
    rectWidth.mockImplementation(function (this: HTMLElement) {
      return rect(this.hasAttribute('data-fit-content') ? 167.2 : 0);
    });
    const { container } = render(<Harness initialRows={rows} />);
    // ceil(167.2) = 168, +1 safety, +24 padding = 193: room for 167.2.
    expect(colWidths(container)[1]).toBe('193px');
  });

  it('does not re-measure when the data changes', () => {
    const { container } = render(<Harness initialRows={rows} />);
    expect(colWidths(container)[1]).toBe('121px');
    fireEvent.click(screen.getByText('change data'));
    expect(screen.getByText('A very long replacement name')).toBeInTheDocument();
    expect(colWidths(container)[1]).toBe('121px');
  });

  it('a user width wins and is saved; the fitted width is not', () => {
    const { container } = render(<Harness initialRows={rows} />);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    fireEvent.keyDown(screen.getAllByRole('separator')[0], { key: 'ArrowRight' });

    expect(colWidths(container)[1]).toBe('137px');
    expect(screen.getAllByRole('separator')[0]).toHaveAttribute('aria-valuenow', '137');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').widths).toEqual({
      name: 137,
    });
  });

  it('Reset columns re-measures the columns that had a user width', () => {
    const { container } = render(<Harness initialRows={rows} />);
    fireEvent.keyDown(screen.getAllByRole('separator')[0], { key: 'End' });
    expect(colWidths(container)[1]).toBe('640px');

    // The content grew in the meantime; a reset fits to what is there now.
    rectWidth.mockImplementation(function (this: HTMLElement) {
      return rect(this.hasAttribute('data-fit-content') ? 20 * CHAR_PX : 0);
    });
    fireEvent.click(screen.getByText('reset'));

    expect(colWidths(container)[1]).toBe('185px');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps the declared width for the loading skeleton', () => {
    const { container } = render(
      <DataTable tableId="fit.test" data={[]} columns={columns()} loading emptyState={emptyState} />
    );
    expect(colWidths(container)).toEqual(['2.5rem', '200px', '60px', '120px']);
    const table = container.querySelector<HTMLTableElement>('[data-slot="table"]');
    const probe = document.createElement('table');
    probe.style.minWidth = 'calc(2.5rem + 200px + 60px + 120px)';
    expect(table?.style.minWidth).toBe(probe.style.minWidth);
  });
});

describe('DataTable widths wider than the declared width', () => {
  const badgeColumns: DataTableColumnConfig<Row>[] = [
    { key: 'name', header: 'Name', width: '100px', render: (row) => row.name },
    { key: 'badges', header: 'Auth', width: '140px', render: () => 'B'.repeat(30) },
  ];

  beforeEach(() => {
    scrollWidth.mockReturnValue(0);
    rectWidth.mockImplementation(function (this: HTMLElement) {
      return rect(
        this.hasAttribute('data-fit-content') ? (this.textContent ?? '').length * CHAR_PX : 0
      );
    });
  });

  function renderIn(width: number) {
    clientWidth.mockImplementation(function (this: Element) {
      return this.hasAttribute('data-table-id') ? width : 0;
    });
    return render(
      <DataTable
        tableId="room.test"
        data={[{ id: 'r1', name: 'Short' }]}
        columns={badgeColumns}
        loading={false}
        emptyState={emptyState}
      />
    );
  }

  it('lets a cell wider than the declared width fit while there is room', () => {
    const { container } = renderIn(1000);
    // badges: 240 + 25 = 265 (declared 140); name: 40 + 25 = 65 raised to min 64 -> 65.
    expect(colWidths(container)).toEqual(['65px', '265px', '']);
  });

  it('does not shrink fitted columns in a narrow container: the table scrolls instead', () => {
    const { container } = renderIn(300);
    expect(colWidths(container)).toEqual(['65px', '265px', '']);
    const table = container.querySelector<HTMLTableElement>('[data-slot="table"]');
    const probe = document.createElement('table');
    probe.style.minWidth = 'calc(65px + 265px)';
    expect(table?.style.minWidth).toBe(probe.style.minWidth);
  });
});

function ResetHarness() {
  const { visibleColumns, resetColumns } = useDataTableColumnState(
    [
      { key: 'open', header: '', width: '60px', render: () => <button>Open</button> },
      { key: 'name', header: 'Name', width: '100px', render: (row: Row) => row.name },
    ],
    { tableId: 'fit.test' }
  );
  return (
    <>
      <button onClick={resetColumns}>reset</button>
      <DataTable
        tableId="fit.test"
        data={[{ id: 'r1', name: 'Short' }]}
        columns={visibleColumns}
        loading={false}
        emptyState={emptyState}
      />
    </>
  );
}

describe('DataTable empty-header columns', () => {
  beforeEach(() => {
    clientWidth.mockReturnValue(0);
    scrollWidth.mockReturnValue(0);
    rectWidth.mockReturnValue(rect(0));
  });

  const buttonColumns: DataTableColumnConfig<Row>[] = [
    {
      key: 'open',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: () => <button>Open</button>,
    },
    { key: 'name', header: 'Name', width: '100px', render: (row) => row.name },
  ];

  it('treats them as chrome: compact padding, no truncate wrapper, no clipping', () => {
    const { container } = render(
      <DataTable
        tableId="btn.test"
        data={[{ id: 'r1', name: 'Short' }]}
        columns={buttonColumns}
        loading={false}
        emptyState={emptyState}
      />
    );
    const cell = container.querySelector('tbody td') as HTMLElement;
    expect(cell).not.toHaveClass('px-3');
    expect(cell).not.toHaveClass('overflow-hidden');
    expect(cell.querySelector('.truncate')).toBeNull();
    expect(container.querySelector('th')).not.toHaveClass('px-3');
    // No handle on the chrome column, nor on the last real column (nothing sits to its right).
    expect(container.querySelector('th[data-column-key="open"] [role="separator"]')).toBeNull();
    expect(container.querySelector('th[data-column-key="name"] [role="separator"]')).toBeNull();
  });

  it('renders at exactly the declared width: wider container, narrower container and after reset', () => {
    rectWidth.mockImplementation(function (this: HTMLElement) {
      return rect(
        this.hasAttribute('data-fit-content') ? (this.textContent ?? '').length * CHAR_PX : 0
      );
    });
    const exact = (container: HTMLElement) => {
      const col = container.querySelector('colgroup > col') as HTMLElement;
      const th = container.querySelector('th') as HTMLElement;
      const td = container.querySelector('tbody td') as HTMLElement;
      for (const el of [col, th, td])
        expect(el.style.width).toBe(DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH);
      for (const el of [th, td]) {
        expect(el.style.minWidth).toBe(DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH);
        expect(el.style.maxWidth).toBe(DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH);
      }
    };
    for (const width of [1000, 120]) {
      clientWidth.mockImplementation(function (this: Element) {
        return this.hasAttribute('data-table-id') ? width : 0;
      });
      const { container, unmount } = render(<ResetHarness />);
      exact(container);
      fireEvent.click(screen.getByText('reset'));
      exact(container);
      unmount();
    }
  });
});

describe('DataTable filler column', () => {
  beforeEach(() => rectWidth.mockReturnValue(rect(0)));

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

  it('is present for mixed fixed and min columns, which all keep their exact width', () => {
    const { container } = render(
      <DataTable
        tableId="filler.test"
        data={[{ id: 'r1', name: 'Short' }]}
        columns={[
          { key: 'icon', header: '', ...DETAIL_CHECKBOX_COLUMN, render: () => null },
          {
            key: 'name',
            header: 'Name',
            width: '240px',
            columnWidthMode: 'min',
            render: () => 'x',
          },
          { key: 'code', header: 'Code', width: '60px', render: (row) => row.id },
        ]}
        loading={false}
        emptyState={emptyState}
      />
    );
    const cols = Array.from(container.querySelectorAll('colgroup > col')) as HTMLElement[];
    expect(cols.map((col) => col.style.width)).toEqual(['2.5rem', '240px', '60px', '']);
    expect(cols[3]).toHaveAttribute('data-column-filler');
  });

  it('is left out when a column has no width and takes the leftover space by design', () => {
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

describe('chrome column widths come from the shared constants', () => {
  beforeEach(() => {
    clientWidth.mockReturnValue(0);
    scrollWidth.mockReturnValue(0);
    rectWidth.mockReturnValue(rect(0));
  });

  const chrome: DataTableColumnConfig<Row>[] = [
    { key: 'avatar', header: '', width: '90px', render: () => <i /> },
    { key: 'name', header: 'Name', width: '100px', render: (row) => row.name },
    { key: 'navigation', header: '', width: '90px', render: () => <button>Open</button> },
  ];

  it('uses the same actions width in the table, the colgroup and the skeleton', () => {
    const actions = { render: () => <button>More</button> };
    const loaded = render(
      <DataTable
        tableId="chrome.test"
        data={[{ id: 'r1', name: 'Short' }]}
        columns={chrome}
        loading={false}
        emptyState={emptyState}
        actionsColumn={actions}
      />
    );
    const headers = Array.from(loaded.container.querySelectorAll('th'));
    const actionsHeader = headers[3] as HTMLElement;
    expect(actionsHeader.style.width).toBe(DATA_TABLE_ACTIONS_COLUMN_WIDTH);
    expect(actionsHeader.style.minWidth).toBe(DATA_TABLE_ACTIONS_COLUMN_WIDTH);
    expect(actionsHeader.className).not.toContain('w-[100px]');
    const cols = Array.from(loaded.container.querySelectorAll('colgroup > col')) as HTMLElement[];
    expect(cols[3].style.width).toBe(DATA_TABLE_ACTIONS_COLUMN_WIDTH);

    const skeleton = render(
      <DataTable
        tableId="chrome.test"
        data={[]}
        columns={chrome}
        loading
        emptyState={emptyState}
        actionsColumn={actions}
      />
    );
    const skeletonCols = Array.from(
      skeleton.container.querySelectorAll('colgroup > col')
    ) as HTMLElement[];
    expect(skeletonCols[skeletonCols.length - 1].style.width).toBe(DATA_TABLE_ACTIONS_COLUMN_WIDTH);
  });

  it('the constant wins over a width the caller declares for an avatar or open-button column', () => {
    const { container } = render(
      <DataTable
        tableId="chrome.test"
        data={[{ id: 'r1', name: 'Short' }]}
        columns={chrome}
        loading={false}
        emptyState={emptyState}
      />
    );
    const cols = Array.from(container.querySelectorAll('colgroup > col')) as HTMLElement[];
    expect(cols[0].style.width).toBe(DATA_TABLE_AVATAR_COLUMN_WIDTH);
    expect(cols[2].style.width).toBe(DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH);
  });
});

describe('last real column has no resize handle', () => {
  beforeEach(() => {
    clientWidth.mockReturnValue(0);
    scrollWidth.mockReturnValue(0);
    rectWidth.mockReturnValue(rect(0));
  });

  const all: DataTableColumnConfig<Row>[] = [
    { key: 'name', header: 'Name', width: '100px', render: (row) => row.name },
    { key: 'code', header: 'Code', width: '100px', render: (row) => row.id },
    { key: 'extra', header: 'Extra', width: '100px', render: () => 'x' },
  ];

  function ListHarness({ initial, actions }: { initial: string[]; actions?: boolean }) {
    const [keys, setKeys] = useState(initial);
    const { visibleColumns } = useDataTableColumnState(
      keys.map((key) => all.find((column) => column.key === key) as DataTableColumnConfig<Row>),
      { tableId: 'last.test' }
    );
    return (
      <>
        <button onClick={() => setKeys(['name', 'code', 'extra'])}>show extra</button>
        <button onClick={() => setKeys(['code', 'name'])}>swap</button>
        <DataTable
          tableId="last.test"
          data={[{ id: 'r1', name: 'Short' }]}
          columns={visibleColumns}
          loading={false}
          emptyState={emptyState}
          actionsColumn={actions ? { render: () => <button>More</button> } : undefined}
        />
      </>
    );
  }

  const labels = () =>
    screen.queryAllByRole('separator').map((el) => el.getAttribute('aria-label'));

  beforeEach(() => {
    window.localStorage.clear();
    setUser('u1');
  });
  afterEach(() => setUser(null));

  it('shows no handle on a trailing data column; the filler is not "last"', () => {
    const { container } = render(<ListHarness initial={['name', 'code']} />);
    expect(container.querySelector('[data-column-filler]')).not.toBeNull();
    expect(labels()).toEqual(['resizeColumn{"column":"Name"}']);
  });

  it('gives it a handle again once another column follows, and follows the visible order', () => {
    render(<ListHarness initial={['name', 'code']} />);
    fireEvent.click(screen.getByText('show extra'));
    expect(labels()).toEqual(['resizeColumn{"column":"Name"}', 'resizeColumn{"column":"Code"}']);
    fireEvent.click(screen.getByText('swap'));
    expect(labels()).toEqual(['resizeColumn{"column":"Code"}']);
  });

  it('keeps the handle when an actions column sits to its right', () => {
    render(<ListHarness initial={['name', 'code']} actions />);
    expect(labels()).toEqual(['resizeColumn{"column":"Name"}', 'resizeColumn{"column":"Code"}']);
  });
});
