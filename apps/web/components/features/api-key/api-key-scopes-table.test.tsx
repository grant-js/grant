// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import type { ApiKeyScopeRow } from '@/lib/api-key-scope-groups';

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const t = (key: string, values?: Record<string, unknown>) => {
      const full = namespace ? `${namespace}.${key}` : key;
      return values ? `${full} ${Object.values(values).join(' ')}` : full;
    };
    t.has = () => false;
    return t;
  },
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { ApiKeyScopesTable } = await import('./api-key-scopes-table');

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as typeof window.matchMedia;
});

function row(id: string, slug: string, action: string, machineOnly = false): ApiKeyScopeRow {
  return {
    permission: {
      id,
      name: `${slug} ${action}`,
      action,
      description: null,
      resource: { slug, name: slug },
    },
    machineOnly,
  };
}

const rows = [
  row('u-query', 'user', 'query'),
  row('u-read', 'user', 'read'),
  row('p-read', 'project-user', 'read'),
  row('p-export', 'project-user', 'export-credentials', true),
];

function renderTable(props: Partial<React.ComponentProps<typeof ApiKeyScopesTable>> = {}) {
  const onSelectionChange = vi.fn();
  render(
    <TooltipProvider>
      <ApiKeyScopesTable
        title="Scopes"
        rows={rows}
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
        {...props}
      />
    </TooltipProvider>
  );
  return { onSelectionChange };
}

describe('ApiKeyScopesTable', () => {
  it('groups the permissions under one header row per resource', () => {
    renderTable();

    expect(screen.getByRole('button', { name: /project-user/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^user/ })).toBeInTheDocument();
    expect(screen.getByText('user:query')).toBeInTheDocument();
    expect(screen.getByText('project-user:read')).toBeInTheDocument();
  });

  it('shows the whole catalogue at once, with no pager', () => {
    renderTable();

    expect(screen.queryByRole('button', { name: /previous/i })).toBeNull();
    expect(screen.getAllByRole('checkbox', { name: /scopes.table.select/ })).toHaveLength(
      rows.length
    );
  });

  it('selects every action of a resource from its all-actions checkbox', () => {
    const { onSelectionChange } = renderTable({ selectedIds: ['p-read'] });

    fireEvent.click(screen.getByRole('checkbox', { name: /scopes.groups.allActionsFor user$/ }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['p-read', 'u-query', 'u-read']);
  });

  it('clears every action of a resource from its checked all-actions checkbox', () => {
    const { onSelectionChange } = renderTable({ selectedIds: ['p-read', 'u-query', 'u-read'] });

    fireEvent.click(screen.getByRole('checkbox', { name: /scopes.groups.allActionsFor user$/ }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['p-read']);
  });

  it('shows the group checkbox as indeterminate when some actions are selected', () => {
    renderTable({ selectedIds: ['u-read'] });

    expect(
      screen.getByRole('checkbox', { name: /scopes.groups.allActionsFor user$/ })
    ).toHaveAttribute('aria-checked', 'mixed');
    expect(
      screen.getByRole('checkbox', { name: /scopes.groups.allActionsFor project-user/ })
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('shows the group checkbox as checked when all actions are selected', () => {
    renderTable({ selectedIds: ['u-query', 'u-read'] });

    expect(
      screen.getByRole('checkbox', { name: /scopes.groups.allActionsFor user$/ })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles a single action', () => {
    const { onSelectionChange } = renderTable({ selectedIds: ['p-read'] });

    fireEvent.click(screen.getByRole('checkbox', { name: /scopes.table.select user read/ }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['p-read', 'u-read']);
  });

  it('filters by search text and keeps the group header of the matches', () => {
    renderTable();

    fireEvent.change(screen.getByPlaceholderText('user.apiKeys.scopes.search.placeholder'), {
      target: { value: 'export' },
    });

    // the search box is debounced
    return vi.waitFor(() => {
      expect(screen.getByText('project-user:export-credentials')).toBeInTheDocument();
      expect(screen.queryByText('user:query')).toBeNull();
      expect(screen.queryByRole('button', { name: /^user/ })).toBeNull();
    });
  });

  it('marks a machine-only permission with a badge', () => {
    renderTable();

    expect(screen.getAllByText('user.apiKeys.scopes.machineOnly.badge')).toHaveLength(1);
    const exportRow = screen.getByText('project-user:export-credentials').closest('tr')!;
    expect(
      within(exportRow).getByText('user.apiKeys.scopes.machineOnly.badge')
    ).toBeInTheDocument();
  });

  it('collapses and expands a resource group', () => {
    renderTable();

    const header = screen.getByRole('button', { name: /^user/ });
    expect(header).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('user:query')).toBeNull();
    expect(screen.getByText('project-user:read')).toBeInTheDocument();

    fireEvent.click(header);
    expect(screen.getByText('user:query')).toBeInTheDocument();
  });

  it('insets nested permission rows under the resource group header', () => {
    renderTable();

    const groupCheckbox = screen.getByRole('checkbox', {
      name: /scopes.groups.allActionsFor user$/,
    });
    const childCheckbox = screen.getByRole('checkbox', { name: /scopes.table.select user query/ });
    const groupLeading = groupCheckbox.closest('[data-leading-inset]');
    const childLeading = childCheckbox.closest('[data-leading-inset]');

    expect(groupLeading).not.toBeNull();
    expect(childLeading).not.toBeNull();
    expect(Number(childLeading!.getAttribute('data-leading-inset'))).toBeGreaterThan(
      Number(groupLeading!.getAttribute('data-leading-inset'))
    );
    expect(groupCheckbox.closest('td')?.cellIndex).toBe(0);
    expect(childCheckbox.closest('td')?.cellIndex).toBe(0);
  });

  it('lets a hosted pager use the full footer width instead of shrinking', () => {
    renderTable({ paginated: true, limit: 2, page: 1, onPageChange: vi.fn() });

    const footer = document.querySelector('[data-slot="card-footer"]');
    const pager = footer?.querySelector('[data-slot="pagination"]');
    const pagerWrap = pager?.parentElement;

    expect(pager).toHaveClass('w-full');
    expect(pagerWrap).toHaveClass('flex-1');
    expect(pagerWrap).toHaveClass('min-w-0');
  });

  it('renders every checkbox disabled when read only', () => {
    renderTable({ readOnly: true, selectedIds: ['u-query'] });

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toBeDisabled();
    }
  });

  it('disables a row listed as disabled but leaves the rest togglable', () => {
    const { onSelectionChange } = renderTable({
      selectedIds: ['u-query'],
      disabledRows: new Map([['u-query', 'not yours']]),
    });

    expect(screen.getByRole('checkbox', { name: /scopes.table.select user query/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /scopes.table.select user read/ }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['u-query', 'u-read']);
  });
});
