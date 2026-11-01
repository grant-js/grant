// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTable } from './data-table';
import {
  DETAIL_CHECKBOX_COLUMN,
  DETAIL_TEXT_COLUMN,
  DetailTableCheckboxCell,
} from './detail-table-layout';

const LONG_NAME = `GrantScope${'A'.repeat(80)}`;

const emptyState = {
  icon: <span />,
  title: 'Empty',
  description: 'No rows',
};

describe('DataTable', () => {
  it('keeps a long unbreakable text cell inside the container and exposes the full value on title', () => {
    const { container } = render(
      <div data-testid="table-harness" className="w-[320px] max-w-[320px]">
        <DataTable
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

    expect(table).toHaveClass('table-fixed', 'w-full');
    expect(table).not.toHaveClass('w-max');
    expect(table).not.toHaveClass('table-auto');
    expect(tableContainer).toHaveClass('overflow-x-hidden');
    expect(titled).not.toBeNull();
    expect(titled).toHaveClass('truncate');
    expect(screen.getByText(LONG_NAME)).toBeInTheDocument();
  });

  it('does not truncate checkbox chrome columns', () => {
    const { container } = render(
      <DataTable
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
