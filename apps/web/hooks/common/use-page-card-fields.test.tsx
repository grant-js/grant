// @vitest-environment jsdom
import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageTableColumnToggle } from '@/components/common/data-table-column-toggle';
import { useDataTableColumnsStore } from '@/stores/data-table-columns.store';

import { usePageCardFields } from './use-page-card-fields';

vi.mock('./use-current-user-id', () => ({ useCurrentUserId: () => 'user-1' }));

const messages = {
  common: {
    dataTable: {
      columns: 'Columns',
      toggleColumns: 'Toggle columns',
      resetColumns: 'Reset columns',
      fields: 'Fields',
      toggleFields: 'Toggle fields',
      resetFields: 'Reset fields',
      moveColumnUp: 'Move {column} up',
      moveColumnDown: 'Move {column} down',
      columnMoved: '{column} moved to position {position} of {total}',
    },
  },
};

const fields = [
  { key: 'roles', label: 'Roles' },
  { key: 'apiKeys', label: 'API keys' },
  { key: 'tags', label: 'Tags' },
];

/** One card's body items: the three fields and one item the picker does not manage. */
const items = [
  { key: 'roles', text: 'Roles' },
  { key: 'apiKeys', text: 'API keys' },
  { key: 'tags', text: 'Tags' },
  { text: 'Unmanaged' },
];

function CardView() {
  const { arrange } = usePageCardFields(fields, { listId: 'things.list' });
  return (
    <output data-testid="body">
      {arrange(items)
        .map((item) => item.text)
        .join(',')}
    </output>
  );
}

function Page() {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <CardView />
      <PageTableColumnToggle iconOnly={false} />
    </NextIntlClientProvider>
  );
}

const body = () => screen.getByTestId('body').textContent;
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Fields' }));

afterEach(() => {
  window.localStorage.clear();
  useDataTableColumnsStore.getState().clearColumnToggle();
});

describe('usePageCardFields', () => {
  it('shows every field in declared order, with unmanaged items kept at the end', () => {
    render(<Page />);
    expect(body()).toBe('Roles,API keys,Tags,Unmanaged');
  });

  it('publishes the fields to the toolbar picker, labelled as fields', () => {
    render(<Page />);
    open();
    const rows = within(screen.getByRole('list', { name: 'Toggle fields' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(rows).toEqual(['Roles', 'API keys', 'Tags']);
    expect(screen.queryByRole('button', { name: 'Columns' })).toBeNull();
  });

  it('hides and moves fields, keeps the choice for the next visit, and resets it', () => {
    const { unmount } = render(<Page />);
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: 'API keys' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Tags up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Tags up' }));
    expect(body()).toBe('Tags,Roles,Unmanaged');
    unmount();

    render(<Page />);
    expect(body()).toBe('Tags,Roles,Unmanaged');

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Reset fields' }));
    expect(body()).toBe('Roles,API keys,Tags,Unmanaged');
  });

  it('saves the cards apart from the table of the same list', () => {
    render(<Page />);
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Roles' }));
    const keys = Object.keys(window.localStorage);
    expect(keys.some((key) => key.includes('things.list.cards'))).toBe(true);
    expect(keys.some((key) => key.endsWith('things.list'))).toBe(false);
  });
});
