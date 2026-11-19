// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoadedCountChip, RelationCountChip } from './relation-count-chip';

const preview = {
  load: vi.fn(),
  items: undefined as Array<{ id: string; name: string; color?: string }> | undefined,
  loading: false,
  error: false,
  called: false,
};

vi.mock('@/hooks/common', () => ({ useRelationPreview: () => preview }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ organizationId: 'org-1', projectId: 'project-1' }),
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) =>
    `${namespace ? `${namespace}.` : ''}${key}${values ? ` ${Object.values(values).join(' ')}` : ''}`,
}));

const BASE = '/dashboard/organizations/org-1/projects/project-1';
const items = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `r-${i + 1}`, name: `Role ${i + 1}` }));

const chip = () => screen.getByRole('button', { name: '3 roles' });

beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(preview, { items: undefined, loading: false, error: false, called: false });
  preview.load.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('RelationCountChip', () => {
  it('is a plain badge with nothing to preview when the count is zero', () => {
    render(
      <RelationCountChip entity="user" relation="roles" entityId="u-1" count={0}>
        0 roles
      </RelationCountChip>
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('0 roles')).toBeDefined();
  });

  it('fetches nothing until hovered, then opens after the delay and fetches once', () => {
    render(
      <RelationCountChip entity="user" relation="roles" entityId="u-1" count={3}>
        3 roles
      </RelationCountChip>
    );
    expect(preview.load).not.toHaveBeenCalled();

    fireEvent.mouseEnter(chip());
    act(() => vi.advanceTimersByTime(299));
    expect(preview.load).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(preview.load).toHaveBeenCalledTimes(1);
    expect(screen.getByText('common.loading')).toBeDefined();
  });

  it('opens at once on keyboard focus, and does not fetch again once called', () => {
    preview.called = true;
    preview.items = items(2);
    render(
      <RelationCountChip entity="user" relation="roles" entityId="u-1" count={3}>
        3 roles
      </RelationCountChip>
    );
    fireEvent.focus(chip());
    expect(preview.load).not.toHaveBeenCalled();
    expect(screen.getByText('Role 1')).toBeDefined();
  });

  it('links each related item to its detail page', () => {
    preview.called = true;
    preview.items = items(2);
    render(
      <RelationCountChip entity="user" relation="roles" entityId="u-1" count={3}>
        3 roles
      </RelationCountChip>
    );
    fireEvent.focus(chip());
    expect(screen.getByText('Role 2').closest('a')?.getAttribute('href')).toBe(`${BASE}/roles/r-2`);
  });

  it('shows tags as chips, without links', () => {
    preview.called = true;
    preview.items = [{ id: 't-1', name: 'Finance', color: 'blue' }];
    render(
      <RelationCountChip entity="user" relation="tags" entityId="u-1" count={1}>
        1 tag
      </RelationCountChip>
    );
    fireEvent.focus(screen.getByRole('button', { name: '1 tag' }));
    expect(screen.getByText('Finance').closest('a')).toBeNull();
  });

  it('lists ten and links "View all" to the entity when there are more', () => {
    preview.called = true;
    preview.items = items(12);
    render(
      <RelationCountChip entity="role" relation="groups" entityId="role-9" count={12}>
        12 groups
      </RelationCountChip>
    );
    fireEvent.focus(screen.getByRole('button', { name: '12 groups' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    const viewAll = screen.getByText('common.relationPreview.viewAll 12');
    expect(viewAll.closest('a')?.getAttribute('href')).toBe(`${BASE}/roles/role-9`);
  });

  it('says "Not available" when the fetch fails', () => {
    preview.called = true;
    preview.error = true;
    render(
      <RelationCountChip entity="user" relation="roles" entityId="u-1" count={3}>
        3 roles
      </RelationCountChip>
    );
    fireEvent.focus(chip());
    expect(screen.getByText('common.relationPreview.notAvailable')).toBeDefined();
  });
});

describe('LoadedCountChip', () => {
  const tags = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `t-${i + 1}`, name: `Tag ${i + 1}` }));

  it('lists the tags the list already loaded, at once and without fetching', () => {
    render(
      <LoadedCountChip items={tags(2)} count={2}>
        2 tags
      </LoadedCountChip>
    );
    fireEvent.mouseEnter(screen.getByRole('button', { name: '2 tags' }));
    act(() => vi.advanceTimersByTime(300));
    expect(preview.load).not.toHaveBeenCalled();
    expect(screen.getByText('Tag 2').closest('a')).toBeNull();
    expect(screen.queryByTestId('relation-loading')).toBeNull();
  });

  it('lists every tag, with no "View all" to fetch the rest from', () => {
    render(
      <LoadedCountChip items={tags(12)} count={12}>
        12 tags
      </LoadedCountChip>
    );
    fireEvent.focus(screen.getByRole('button', { name: '12 tags' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    expect(screen.queryByText(/viewAll/)).toBeNull();
  });

  it('is a plain badge when there are no tags', () => {
    render(
      <LoadedCountChip items={[]} count={0}>
        0 tags
      </LoadedCountChip>
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('LoadedCountChip with linked items', () => {
  it('links each item to its detail page (an API key’s permissions)', () => {
    render(
      <LoadedCountChip
        items={[{ id: 'p-1', name: 'Read invoices' }]}
        count={1}
        linkTo="permissions"
      >
        Permissions (1)
      </LoadedCountChip>
    );
    fireEvent.focus(screen.getByRole('button', { name: 'Permissions (1)' }));
    expect(screen.getByText('Read invoices').closest('a')?.getAttribute('href')).toBe(
      `${BASE}/permissions/p-1`
    );
    expect(preview.load).not.toHaveBeenCalled();
  });
});
