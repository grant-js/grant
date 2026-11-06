// @vitest-environment jsdom

import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DataTableColumnConfig } from '@/components/common/data-table';
import { useDataTableColumnState } from '@/hooks/common/use-data-table-column-state';
import { usePageTableColumnVisibility } from '@/hooks/common/use-page-table-column-visibility';
import { useDataTableColumnsStore } from '@/stores/data-table-columns.store';

import { DataTableColumnToggle, PageTableColumnToggle } from './data-table-column-toggle';

const messages = {
  common: {
    dataTable: {
      columns: 'Columns',
      toggleColumns: 'Toggle columns',
      resetColumns: 'Reset columns',
      moveColumnUp: 'Move {column} up',
      moveColumnDown: 'Move {column} down',
      columnMoved: '{column} moved to position {position} of {total}',
    },
  },
};

type Row = Record<string, never>;

const columns: DataTableColumnConfig<Row>[] = [
  { key: 'icon', header: '', render: () => null },
  { key: 'name', header: 'Name', render: () => null },
  { key: 'email', header: 'Email', render: () => null },
  { key: 'role', header: 'Role', render: () => null },
  { key: 'actions', header: 'Actions', render: () => null },
];

const none = new Set<string>();

// jsdom has no PointerEvent; without it clientY and pointerId are lost on pointer events.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

function Provider({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

/** Inline path: a table owner wires the hook to the picker directly. */
function InlineTable() {
  const { columnToggleItems, toggleColumn, moveColumn, resetColumns, visibleColumns } =
    useDataTableColumnState(columns, { tableId: 'inline.test', defaultHiddenKeys: none });
  return (
    <>
      <DataTableColumnToggle
        columns={columnToggleItems}
        onToggle={toggleColumn}
        onMove={moveColumn}
        onReset={resetColumns}
        iconOnly={false}
      />
      <output data-testid="order">{visibleColumns.map((column) => column.key).join(',')}</output>
    </>
  );
}

/** List-page path: the table publishes to the store, the toolbar renders the picker. */
function PublishingTable() {
  const { visibleColumns } = usePageTableColumnVisibility(columns, { tableId: 'page.test' });
  return (
    <output data-testid="order">{visibleColumns.map((column) => column.key).join(',')}</output>
  );
}

function PageToolbar() {
  return (
    <>
      <PublishingTable />
      <PageTableColumnToggle iconOnly={false} />
    </>
  );
}

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
const order = () => screen.getByTestId('order').textContent;
const rowLabels = () =>
  within(screen.getByRole('list', { name: 'Toggle columns' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

afterEach(() => {
  window.localStorage.clear();
  useDataTableColumnsStore.getState().clearColumnToggle();
  vi.restoreAllMocks();
});

describe.each([
  ['inline picker', InlineTable],
  ['list-page toolbar picker', PageToolbar],
])('%s', (_name, Component) => {
  it('lists the columns with a checkbox each and moves one up and down', () => {
    render(
      <Provider>
        <Component />
      </Provider>
    );
    open();

    expect(rowLabels()).toEqual(['Name', 'Email', 'Role', 'Actions']);
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Move Role up' }));
    expect(order()).toBe('icon,name,role,email,actions');
    expect(rowLabels()).toEqual(['Name', 'Role', 'Email', 'Actions']);

    fireEvent.click(screen.getByRole('button', { name: 'Move Name down' }));
    expect(order()).toBe('icon,role,name,email,actions');
  });

  it('disables move up on the first and move down on the last movable column', () => {
    render(
      <Provider>
        <Component />
      </Provider>
    );
    open();

    expect(screen.getByRole('button', { name: 'Move Name up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Name down' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Role down' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Role up' })).toBeEnabled();
  });

  it('gives the locked actions column a checkbox but no move controls', () => {
    render(
      <Provider>
        <Component />
      </Provider>
    );
    open();

    expect(screen.getByRole('checkbox', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move Actions/ })).toBeNull();
    expect(screen.queryByTestId('column-grip-actions')).toBeNull();
  });

  it('announces the new position', () => {
    render(
      <Provider>
        <Component />
      </Provider>
    );
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Move Email up' }));
    expect(within(screen.getByRole('dialog')).getByRole('status')).toHaveTextContent(
      'Email moved to position 1 of 3'
    );
  });

  it('keeps keyboard focus on the move button just used', () => {
    render(
      <Provider>
        <Component />
      </Provider>
    );
    open();

    const button = screen.getByRole('button', { name: 'Move Role up' });
    button.focus();
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Move Role up' })).toHaveFocus();

    // At the end of the range the button is disabled, so focus goes to the other one.
    fireEvent.click(screen.getByRole('button', { name: 'Move Role up' }));
    expect(screen.getByRole('button', { name: 'Move Role down' })).toHaveFocus();
  });

  it('hides a column from the checkbox without moving it', () => {
    render(
      <Provider>
        <Component />
      </Provider>
    );
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Move Role up' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Role' }));
    expect(order()).toBe('icon,name,email,actions');
    expect(rowLabels()).toEqual(['Name', 'Role', 'Email', 'Actions']);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Role' }));
    expect(order()).toBe('icon,name,role,email,actions');
  });

  it('resets visibility and order from the bottom button', () => {
    render(
      <Provider>
        <Component />
      </Provider>
    );
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Move Role up' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Email' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset columns' }));

    expect(order()).toBe('icon,name,email,role,actions');
    expect(rowLabels()).toEqual(['Name', 'Email', 'Role', 'Actions']);
  });
});

describe('drag with the grip', () => {
  function mockRows() {
    const rows = screen.getAllByRole('listitem');
    rows.forEach((row, index) => {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
        top: index * 30,
        height: 30,
        bottom: index * 30 + 30,
      } as DOMRect);
    });
  }

  it('reorders a row dragged by its grip and announces it', () => {
    render(
      <Provider>
        <InlineTable />
      </Provider>
    );
    open();
    mockRows();

    const grip = screen.getByTestId('column-grip-name');
    fireEvent.pointerDown(grip, { button: 0, pointerId: 1, clientY: 15 });
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 75 });
    fireEvent.pointerUp(grip, { pointerId: 1, clientY: 75 });

    expect(order()).toBe('icon,email,role,name,actions');
    expect(within(screen.getByRole('dialog')).getByRole('status')).toHaveTextContent(
      'Name moved to position 3 of 3'
    );
  });

  it('does nothing when released on the same row or cancelled', () => {
    render(
      <Provider>
        <InlineTable />
      </Provider>
    );
    open();
    mockRows();

    const grip = screen.getByTestId('column-grip-email');
    fireEvent.pointerDown(grip, { button: 0, pointerId: 1, clientY: 45 });
    fireEvent.pointerUp(grip, { pointerId: 1, clientY: 45 });
    expect(order()).toBe('icon,name,email,role,actions');

    fireEvent.pointerDown(grip, { button: 0, pointerId: 1, clientY: 45 });
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 5 });
    fireEvent.pointerCancel(grip, { pointerId: 1 });
    fireEvent.pointerUp(grip, { pointerId: 1, clientY: 5 });
    expect(order()).toBe('icon,name,email,role,actions');
  });
});
