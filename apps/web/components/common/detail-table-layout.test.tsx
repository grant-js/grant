// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from '@/components/ui/checkbox';

import { DataTable, type DataTableColumnConfig } from './data-table';
import {
  DETAIL_CHECKBOX_COLUMN,
  DETAIL_ICON_COLUMN,
  DETAIL_TEXT_COLUMN,
  DetailTableCheckboxCell,
  withCheckboxSavingState,
} from './detail-table-layout';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

type Row = { id: string; name: string };

const rows: Row[] = [
  { id: 'a', name: 'First' },
  { id: 'b', name: 'Second' },
];

function Harness({ savingId }: { savingId: string | null }) {
  const columns: DataTableColumnConfig<Row>[] = [
    withCheckboxSavingState(
      {
        key: 'checkbox',
        header: '',
        ...DETAIL_CHECKBOX_COLUMN,
        render: (row) => (
          <DetailTableCheckboxCell>
            <Checkbox aria-label={`select ${row.name}`} />
          </DetailTableCheckboxCell>
        ),
      },
      (row) => savingId === row.id
    ),
    { key: 'icon', header: '', ...DETAIL_ICON_COLUMN, render: () => <span /> },
    { key: 'name', header: 'Name', width: '240px', ...DETAIL_TEXT_COLUMN, render: (r) => r.name },
  ];
  return (
    <DataTable
      tableId="assign.test"
      data={rows}
      columns={columns}
      loading={false}
      emptyState={{ icon: <span />, title: 'Empty', description: 'None' }}
    />
  );
}

describe('assignment table checkbox column', () => {
  it('has no trailing loading column and no handle on Name, the last real column', () => {
    const { container } = render(<Harness savingId={null} />);
    expect(container.querySelector('[data-column-key="loading"]')).toBeNull();
    // checkbox, icon, name, filler
    expect(container.querySelectorAll('colgroup > col')).toHaveLength(4);
    expect(screen.queryAllByRole('separator')).toHaveLength(0);
  });

  it('shows a spinner in the checkbox cell of the saving row and brings the checkbox back after', () => {
    const { rerender, container } = render(<Harness savingId="a" />);
    const status = screen.getByRole('status', { name: 'actions.saving' });
    expect(status).toHaveClass('size-4');
    expect(status.closest('td')).toHaveAttribute('data-column-key', 'checkbox');
    expect(screen.queryByRole('checkbox', { name: 'select First' })).toBeNull();
    // The other row keeps its checkbox, and the column width does not change.
    expect(screen.getByRole('checkbox', { name: 'select Second' })).toBeInTheDocument();
    const widthWhileSaving = (container.querySelector('colgroup > col') as HTMLElement).style.width;

    rerender(<Harness savingId={null} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'select First' })).toBeInTheDocument();
    expect((container.querySelector('colgroup > col') as HTMLElement).style.width).toBe(
      widthWhileSaving
    );
  });
});
