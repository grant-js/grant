// @vitest-environment jsdom

import { useState } from 'react';
import { type Account, AccountType } from '@grantjs/schema';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDataTableColumnState } from '@/hooks/common/use-data-table-column-state';
import { useAuthStore } from '@/stores/auth.store';

import { DataTable, type DataTableColumnConfig } from './data-table';
import { DataTableColumnResizeHandle } from './data-table-column-resize-handle';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    `${key}${values ? JSON.stringify(values) : ''}`,
}));

const bounds = { min: 64, max: 640 };
const LABEL = 'resizeColumn{"column":"Name"}';

function Harness({ initial }: { initial?: number }) {
  const [width, setWidth] = useState<number | undefined>(initial);
  return (
    <table>
      <thead>
        <tr>
          <th style={{ position: 'relative' }}>
            Name
            <DataTableColumnResizeHandle
              label="Name"
              width={width}
              defaultWidth={200}
              bounds={bounds}
              onResize={setWidth}
              onReset={() => setWidth(undefined)}
            />
          </th>
        </tr>
      </thead>
    </table>
  );
}

function separator() {
  return screen.getByRole('separator', { name: LABEL });
}

describe('DataTableColumnResizeHandle', () => {
  it('is a vertical, focusable window splitter with value, min and max', () => {
    render(<Harness initial={200} />);
    const handle = separator();
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle).toHaveAttribute('tabindex', '0');
    expect(handle).toHaveAttribute('aria-valuenow', '200');
    expect(handle).toHaveAttribute('aria-valuemin', '64');
    expect(handle).toHaveAttribute('aria-valuemax', '640');
  });

  it('falls back to the default width when the user has not set one', () => {
    render(<Harness />);
    expect(separator()).toHaveAttribute('aria-valuenow', '200');
  });

  it('steps 16px with the arrows and 64px with Shift', () => {
    render(<Harness initial={200} />);
    const handle = separator();
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '216');
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle).toHaveAttribute('aria-valuenow', '184');
    fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true });
    expect(handle).toHaveAttribute('aria-valuenow', '248');
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(handle).toHaveAttribute('aria-valuenow', '184');
  });

  it('jumps to min and max with Home and End and stays within them', () => {
    render(<Harness initial={200} />);
    const handle = separator();
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle).toHaveAttribute('aria-valuenow', '64');
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(handle).toHaveAttribute('aria-valuenow', '64');
    fireEvent.keyDown(handle, { key: 'End' });
    expect(handle).toHaveAttribute('aria-valuenow', '640');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '640');
  });

  it('resets to the default on Enter and on double-click', () => {
    render(<Harness initial={320} />);
    const handle = separator();
    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(handle).toHaveAttribute('aria-valuenow', '200');
    fireEvent.keyDown(handle, { key: 'End' });
    fireEvent.doubleClick(handle);
    expect(handle).toHaveAttribute('aria-valuenow', '200');
  });

  it('resizes live while dragging with pointer capture, clamped to the bounds', () => {
    const setCapture = vi.fn();
    const releaseCapture = vi.fn();
    render(<Harness initial={200} />);
    const handle = separator();
    Object.assign(handle, {
      setPointerCapture: setCapture,
      releasePointerCapture: releaseCapture,
      hasPointerCapture: () => true,
    });

    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 100 });
    expect(setCapture).toHaveBeenCalledWith(1);
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 150 });
    expect(handle).toHaveAttribute('aria-valuenow', '250');
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 5000 });
    expect(handle).toHaveAttribute('aria-valuenow', '640');
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: -5000 });
    expect(handle).toHaveAttribute('aria-valuenow', '64');
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: -5000 });
    expect(releaseCapture).toHaveBeenCalledWith(1);

    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 300 });
    expect(handle).toHaveAttribute('aria-valuenow', '64');
  });
});

type Row = { id: string };

function userWidthColumns(): DataTableColumnConfig<Row>[] {
  return [
    { key: 'select', header: 'Select', width: '2.5rem', render: () => null },
    { key: 'name', header: 'Name', width: '200px', render: (row) => row.id },
    { key: 'fixed', header: 'Fixed', width: '100px', enableResizing: false, render: () => null },
    { key: 'icon', header: '', width: '60px', render: () => null },
    { key: 'status', header: 'Status', width: '120px', render: () => null },
  ];
}

function TableHarness() {
  const { visibleColumns, resetColumns } = useDataTableColumnState(userWidthColumns(), {
    tableId: 'resize.test',
  });
  return (
    <>
      <button type="button" onClick={resetColumns}>
        reset
      </button>
      <DataTable
        tableId="resize.test"
        data={[{ id: 'row-1' }]}
        columns={visibleColumns}
        loading={false}
        emptyState={{ icon: <span />, title: 'Empty', description: 'None' }}
      />
    </>
  );
}

const STORAGE_KEY = 'grant:table:v1:u1:resize.test';

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

function colWidths(container: HTMLElement) {
  return Array.from(container.querySelectorAll('col')).map((col) => col.style.width);
}

describe('DataTable column resize', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setUser('u1');
  });
  afterEach(() => setUser(null));

  it('shows a handle only on resizable columns', () => {
    render(<TableHarness />);
    expect(screen.getAllByRole('separator').map((el) => el.getAttribute('aria-label'))).toEqual([
      'resizeColumn{"column":"Name"}',
      'resizeColumn{"column":"Status"}',
    ]);
  });

  it('applies a keyboard-set width to colgroup, cells and the min-width sum, and persists it', () => {
    const { container } = render(<TableHarness />);
    const handle = screen.getByRole('separator', { name: 'resizeColumn{"column":"Name"}' });
    const table = container.querySelector<HTMLTableElement>('[data-slot="table"]');
    const before = table?.style.minWidth;

    fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true });

    expect(handle).toHaveAttribute('aria-valuenow', '264');
    expect(colWidths(container)[1]).toBe('264px');
    const th = container.querySelectorAll('th')[1];
    expect(th.style.width).toBe('264px');
    expect(th.style.minWidth).toBe('264px');
    expect(th.style.maxWidth).toBe('264px');
    expect(container.querySelectorAll('td')[1].style.width).toBe('264px');
    // Sum: 2.5rem + 264px + 100px + 60px + 120px, not the default 200px.
    expect(table?.style.minWidth).not.toBe(before);
    const probe = document.createElement('table');
    probe.style.minWidth = 'calc(2.5rem + 264px + 100px + 60px + 120px)';
    expect(table?.style.minWidth).toBe(probe.style.minWidth);

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').widths).toEqual({
      name: 264,
    });
  });

  it('restores a saved width on load, clamped to the column bounds', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        visibility: {},
        order: [],
        widths: { name: 5000, status: 150, icon: 400, fixed: 300 },
      })
    );
    const { container } = render(<TableHarness />);
    // name clamps to 640, status keeps 150; icon (no header) and fixed (override) ignore a saved width.
    expect(colWidths(container)).toEqual(['2.5rem', '640px', '100px', '60px', '150px']);
  });

  it('Reset columns clears the user widths', () => {
    const { container } = render(<TableHarness />);
    fireEvent.keyDown(screen.getAllByRole('separator')[0], { key: 'End' });
    expect(colWidths(container)[1]).toBe('640px');

    fireEvent.click(screen.getByText('reset'));

    expect(colWidths(container)[1]).toBe('200px');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('useDataTableColumnState widths', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setUser('u1');
  });
  afterEach(() => setUser(null));

  it('setColumnWidth clamps, null removes, and chrome columns are refused', () => {
    const { result } = renderHook(() =>
      useDataTableColumnState(userWidthColumns(), { tableId: 'resize.test' })
    );
    act(() => result.current.setColumnWidth('name', 5));
    expect(result.current.widths).toEqual({ name: 64 });
    act(() => result.current.setColumnWidth('select', 200));
    act(() => result.current.setColumnWidth('fixed', 200));
    expect(result.current.widths).toEqual({ name: 64 });
    act(() => result.current.setColumnWidth('name', null));
    expect(result.current.widths).toEqual({});
  });
});
