// @vitest-environment jsdom

import { NextIntlClientProvider } from 'next-intl';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { DataTableColumnConfig } from '@/components/common/data-table';
import { PageTableColumnToggle } from '@/components/common/data-table-column-toggle';
import { useDataTableColumnsStore } from '@/stores/data-table-columns.store';

import { usePageTableColumnVisibility } from './use-page-table-column-visibility';

type Row = { id: string; name: string; tags: string };

const columns: DataTableColumnConfig<Row>[] = [
  { key: 'icon', header: '', render: () => null },
  { key: 'name', header: 'Name', render: (row) => row.name },
  { key: 'tags', header: 'Tags', render: (row) => row.tags },
  { key: 'id', header: 'ID', enableHiding: false, render: (row) => row.id },
];

afterEach(() => {
  useDataTableColumnsStore.getState().clearColumnToggle();
});

describe('usePageTableColumnVisibility', () => {
  it('shows every column by default and publishes the hideable ones to the toolbar', () => {
    const { result } = renderHook(() =>
      usePageTableColumnVisibility(columns, { tableId: 'test.table' })
    );

    expect(result.current.visibleColumns.map((column) => column.key)).toEqual([
      'icon',
      'name',
      'tags',
      'id',
    ]);
    expect(useDataTableColumnsStore.getState().columnToggleItems).toEqual([
      { key: 'name', label: 'Name', visible: true, movable: true },
      { key: 'tags', label: 'Tags', visible: true, movable: true },
    ]);
  });

  it('hides a column when the toolbar toggles it off', () => {
    const { result } = renderHook(() =>
      usePageTableColumnVisibility(columns, { tableId: 'test.table' })
    );

    act(() => {
      useDataTableColumnsStore.getState().toggleColumnVisibility?.('tags', false);
    });

    expect(result.current.visibleColumns.map((column) => column.key)).toEqual([
      'icon',
      'name',
      'id',
    ]);
    expect(
      result.current.filterSkeletonColumns([
        { key: 'name', type: 'text' },
        { key: 'tags', type: 'text' },
      ])
    ).toEqual([{ key: 'name', type: 'text' }]);
    expect(useDataTableColumnsStore.getState().columnToggleItems).toContainEqual({
      key: 'tags',
      label: 'Tags',
      visible: false,
      movable: true,
    });
  });

  it('honours the default hidden keys a view passes', () => {
    const { result } = renderHook(() =>
      usePageTableColumnVisibility(columns, {
        tableId: 'test.table',
        defaultHiddenKeys: new Set(['tags']),
      })
    );

    expect(result.current.visibleColumns.map((column) => column.key)).not.toContain('tags');
  });

  it('withdraws the picker when disabled and when the table unmounts', () => {
    const { rerender, unmount } = renderHook(
      ({ enabled }) => usePageTableColumnVisibility(columns, { tableId: 'test.table', enabled }),
      { initialProps: { enabled: true } }
    );
    expect(useDataTableColumnsStore.getState().toggleColumnVisibility).not.toBeNull();

    rerender({ enabled: false });
    expect(useDataTableColumnsStore.getState().toggleColumnVisibility).toBeNull();

    rerender({ enabled: true });
    expect(useDataTableColumnsStore.getState().toggleColumnVisibility).not.toBeNull();

    unmount();
    expect(useDataTableColumnsStore.getState().toggleColumnVisibility).toBeNull();
    expect(useDataTableColumnsStore.getState().columnToggleItems).toEqual([]);
  });
});

describe('PageTableColumnToggle', () => {
  const messages = {
    common: {
      dataTable: { columns: 'Columns', toggleColumns: 'Toggle', resetColumns: 'Reset columns' },
    },
  };

  function Harness({ withTable }: { withTable: boolean }) {
    return (
      <NextIntlClientProvider locale="en" messages={messages}>
        {withTable && <PublishingTable />}
        <PageTableColumnToggle iconOnly={false} />
      </NextIntlClientProvider>
    );
  }

  function PublishingTable() {
    usePageTableColumnVisibility(columns, { tableId: 'test.table' });
    return null;
  }

  it('renders nothing when no list table is on the page', () => {
    render(<Harness withTable={false} />);
    expect(screen.queryByRole('button', { name: 'Columns' })).toBeNull();
  });

  it('renders the column picker once a list table publishes its columns', () => {
    render(<Harness withTable />);
    expect(screen.getByRole('button', { name: 'Columns' })).toBeInTheDocument();
  });

  it('resets the table to its defaults from the picker', async () => {
    render(<Harness withTable />);
    act(() => {
      useDataTableColumnsStore.getState().toggleColumnVisibility?.('tags', false);
    });
    expect(useDataTableColumnsStore.getState().columnToggleItems).toContainEqual({
      key: 'tags',
      label: 'Tags',
      visible: false,
      movable: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reset columns' }));

    expect(useDataTableColumnsStore.getState().columnToggleItems).toContainEqual({
      key: 'tags',
      label: 'Tags',
      visible: true,
      movable: true,
    });
  });
});
