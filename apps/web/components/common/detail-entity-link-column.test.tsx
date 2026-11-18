// @vitest-environment jsdom

import { createElement, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDataTableColumnState } from '@/hooks/common/use-data-table-column-state';
import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';

import { DataTable, type DataTableColumnConfig } from './data-table';
import { detailEntityLinkColumn } from './detail-entity-link-column';
import { DETAIL_TEXT_COLUMN } from './detail-table-layout';

let mockParams: Record<string, string | undefined> = {};

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: { children: ReactNode; href: string }) =>
    createElement('a', { href, ...rest }, children),
}));

type Row = { id: string; name: string; note: string };

const rows: Row[] = [
  { id: 'role-1', name: 'Editor', note: 'Edits things' },
  { id: 'role-2', name: 'Viewer', note: 'Reads things' },
];

function buildColumns(getId: (row: Row) => string | null = (row) => row.id) {
  const columns: DataTableColumnConfig<Row>[] = [
    { key: 'name', header: 'Name', ...DETAIL_TEXT_COLUMN, render: (row) => row.name },
    {
      key: 'note',
      header: 'Note',
      ...DETAIL_TEXT_COLUMN,
      render: (row) => row.note,
    },
    detailEntityLinkColumn<Row>('role', getId, (row) => row.name),
  ];
  return columns;
}

function renderTable(columns: DataTableColumnConfig<Row>[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DataTable
        tableId="detail-entity-link.test"
        data={rows}
        columns={columns}
        loading={false}
        emptyState={{ icon: <span />, title: 'Empty', description: 'None' }}
      />
    </NextIntlClientProvider>
  );
}

describe('detailEntityLinkColumn', () => {
  beforeEach(() => {
    mockParams = {};
    window.localStorage.clear();
  });

  it('links each row to its detail page in an organization project, labelled with its name', () => {
    mockParams = { organizationId: 'org-1', projectId: 'project-1' };
    renderTable(buildColumns());

    const link = screen.getByRole('link', { name: 'Open role Editor' });
    expect(link).toHaveAttribute(
      'href',
      '/dashboard/organizations/org-1/projects/project-1/roles/role-1'
    );
    expect(link).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Open role Viewer' })).toHaveAttribute(
      'href',
      '/dashboard/organizations/org-1/projects/project-1/roles/role-2'
    );
  });

  it('links to the personal-account project route', () => {
    mockParams = { accountId: 'account-1', projectId: 'project-1' };
    renderTable(buildColumns());

    expect(screen.getByRole('link', { name: 'Open role Editor' })).toHaveAttribute(
      'href',
      '/dashboard/accounts/account-1/projects/project-1/roles/role-1'
    );
  });

  it('renders no link for a row without an id', () => {
    mockParams = { organizationId: 'org-1', projectId: 'project-1' };
    renderTable(buildColumns((row) => (row.id === 'role-1' ? row.id : null)));

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'Open role Viewer' })).toBeNull();
  });

  it('stays out of the column picker and stays last when another column moves', () => {
    const columns = buildColumns();
    const { result } = renderHook(() =>
      useDataTableColumnState(columns, { tableId: 'detail-entity-link.picker' })
    );

    expect(result.current.columnToggleItems.map((item) => item.key)).toEqual(['name', 'note']);

    act(() => result.current.moveColumn('name', 1));

    expect(result.current.visibleColumns.map((column) => column.key)).toEqual([
      'note',
      'name',
      'navigation',
    ]);
  });

  it('has the same labels in English and German', () => {
    expect(Object.keys(de.common.openEntity).sort()).toEqual(
      Object.keys(en.common.openEntity).sort()
    );
  });
});
