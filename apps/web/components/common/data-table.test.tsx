// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { dataTableMinWidthStyle } from '@/lib/detail-table-column-width';

import { DataTable } from './data-table';
import {
  DETAIL_CHECKBOX_COLUMN,
  DETAIL_TEXT_COLUMN,
  DetailTableCheckboxCell,
} from './detail-table-layout';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    `${key}${values ? JSON.stringify(values) : ''}`,
}));

const LONG_NAME = `GrantScope${'A'.repeat(80)}`;

/** The min-width string as the DOM normalises it, so the assertion does not depend on calc() folding. */
function normalisedMinWidth(...args: Parameters<typeof dataTableMinWidthStyle>): string {
  const probe = document.createElement('table');
  probe.style.minWidth = String(dataTableMinWidthStyle(...args)?.minWidth ?? '');
  return probe.style.minWidth;
}

const emptyState = {
  icon: <span />,
  title: 'Empty',
  description: 'No rows',
};

describe('DataTable', () => {
  it('truncates a long unbreakable text cell and exposes the full value on title', () => {
    const { container } = render(
      <div data-testid="table-harness" className="w-[320px] max-w-[320px]">
        <DataTable
          tableId="test.table"
          data={[{ id: 'row-1', name: LONG_NAME }]}
          columns={[
            {
              key: 'name',
              header: 'Name',
              columnWidthMode: 'min',
              render: (row) => row.name,
            },
          ]}
          loading={false}
          emptyState={emptyState}
        />
      </div>
    );

    const table = container.querySelector('[data-slot="table"]');
    const tableContainer = container.querySelector('[data-slot="table-container"]');
    const titled = container.querySelector(`[title="${LONG_NAME}"]`);

    expect(container.querySelector('[data-table-id="test.table"]')).not.toBeNull();
    expect(table).toHaveClass('table-fixed', 'w-full');
    expect(table).not.toHaveClass('w-max');
    expect(table).not.toHaveClass('table-auto');
    expect(tableContainer).toHaveClass('overflow-x-auto');
    expect(tableContainer).not.toHaveClass('overflow-x-hidden');
    expect(titled).not.toBeNull();
    expect(titled).toHaveClass('truncate');
    expect(screen.getByText(LONG_NAME)).toBeInTheDocument();
  });

  it('scrolls horizontally once the declared column widths exceed the container', () => {
    const { container } = render(
      <div className="w-[320px] max-w-[320px]">
        <DataTable
          tableId="test.table"
          data={[{ id: 'row-1', name: LONG_NAME }]}
          columns={[
            { key: 'name', header: 'Name', width: '240px', render: (row) => row.name },
            { key: 'id', header: 'ID', width: '15rem', render: (row) => row.id },
            {
              key: 'description',
              header: 'Description',
              columnWidthMode: 'min',
              render: (row) => row.name,
            },
          ]}
          loading={false}
          emptyState={emptyState}
          actionsColumn={{ render: () => <button type="button">Open</button> }}
        />
      </div>
    );

    const table = container.querySelector<HTMLTableElement>('[data-slot="table"]');
    const tableContainer = container.querySelector('[data-slot="table-container"]');

    expect(tableContainer).toHaveClass('overflow-x-auto');
    expect(tableContainer).not.toHaveClass('overflow-x-hidden');
    expect(table?.style.minWidth).toBe(
      normalisedMinWidth([{ width: '240px' }, { width: '15rem' }, {}], true)
    );
    expect(container.querySelector(`[title="${LONG_NAME}"]`)).toHaveClass('truncate');
  });

  it('keeps the loading skeleton scrollable with the same minimum width', () => {
    const { container } = render(
      <DataTable
        tableId="test.table"
        data={[]}
        columns={[
          { key: 'name', header: 'Name', width: '240px', render: () => null },
          { key: 'id', header: 'ID', width: '120px', render: () => null },
        ]}
        loading
        emptyState={emptyState}
      />
    );

    const table = container.querySelector<HTMLTableElement>('[data-slot="table"]');
    expect(container.querySelector('[data-slot="table-container"]')).toHaveClass('overflow-x-auto');
    expect(table?.style.minWidth).toBe(
      normalisedMinWidth([{ width: '240px' }, { width: '120px' }])
    );
  });

  it('does not truncate checkbox chrome columns', () => {
    const { container } = render(
      <DataTable
        tableId="test.table"
        data={[{ id: 'row-1', name: LONG_NAME }]}
        columns={[
          {
            key: 'select',
            header: '',
            ...DETAIL_CHECKBOX_COLUMN,
            render: () => (
              <DetailTableCheckboxCell>
                <input type="checkbox" aria-label="Select row" />
              </DetailTableCheckboxCell>
            ),
          },
          {
            key: 'name',
            header: 'Name',
            ...DETAIL_TEXT_COLUMN,
            render: (row) => row.name,
          },
        ]}
        loading={false}
        emptyState={emptyState}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Select row' });
    const checkboxCell = checkbox.closest('[data-slot="table-cell"]');
    const nameTitle = container.querySelector(`[title="${LONG_NAME}"]`);

    expect(checkboxCell?.querySelector('.truncate')).toBeNull();
    expect(nameTitle).not.toBeNull();
    expect(container.querySelector('[data-slot="table"]')).toHaveClass('table-fixed', 'w-full');
  });

  it('does not truncate the actions column', () => {
    render(
      <DataTable
        tableId="test.table"
        data={[{ id: 'row-1', name: 'Role' }]}
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (row) => row.name,
          },
        ]}
        loading={false}
        emptyState={emptyState}
        actionsColumn={{
          render: () => <button type="button">Open</button>,
        }}
      />
    );

    const action = screen.getByRole('button', { name: 'Open' });
    const actionCell = action.closest('[data-slot="table-cell"]');
    expect(actionCell?.querySelector('.truncate')).toBeNull();
  });
});
