// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RelationListCard } from './relation-list-card';

const page = {
  items: undefined as
    | Array<{
        id: string;
        name: string;
        authenticationMethods?: Array<{ provider: string; providerId: string }>;
      }>
    | undefined,
  totalCount: 0,
  loading: false,
  error: false,
};
const useRelationPage = vi.fn((..._args: unknown[]) => page);

vi.mock('@/hooks/common/use-relation-preview', () => ({
  useRelationPage: (...args: unknown[]) => useRelationPage(...args),
}));
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
const users = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({
    id: `u-${offset + i + 1}`,
    name: `User ${offset + i + 1}`,
  }));

const renderCard = () =>
  render(
    <RelationListCard
      entity="group"
      relation="users"
      entityId="g-1"
      messages="group.members"
      icon={null}
    />
  );

beforeEach(() => {
  Object.assign(page, { items: undefined, totalCount: 0, loading: false, error: false });
  useRelationPage.mockClear();
});

describe('RelationListCard', () => {
  it('lists the related users, each linked to the user page, and nothing to edit', () => {
    Object.assign(page, { items: users(2), totalCount: 2 });
    renderCard();

    expect(screen.getByText('User 1')).toBeDefined();
    expect(
      screen.getByLabelText('common.openEntity.user User 2').closest('a')?.getAttribute('href')
    ).toBe(`${BASE}/users/u-2`);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('pads the avatar column as a table without checkboxes does', () => {
    Object.assign(page, { items: users(1), totalCount: 1 });
    renderCard();

    const avatarCell = screen.getByText('User 1').closest('tr')?.querySelector('td');
    expect(avatarCell?.className).toContain('pl-2');
  });

  it('shows each user’s email next to the name', () => {
    Object.assign(page, {
      items: [
        {
          id: 'u-1',
          name: 'Sam Lee',
          authenticationMethods: [{ provider: 'email', providerId: 'sam.lee@example.test' }],
        },
        { id: 'u-2', name: 'Sam Lee' },
      ],
      totalCount: 2,
    });
    renderCard();
    expect(screen.getAllByText('Sam Lee')).toHaveLength(2);
    expect(screen.getAllByTestId('user-label-email').map((el) => el.textContent)).toEqual([
      'sam.lee@example.test',
    ]);
  });

  it('shows no email next to groups', () => {
    Object.assign(page, { items: [{ id: 'g-1', name: 'Finance' }], totalCount: 1 });
    render(
      <RelationListCard
        entity="permission"
        relation="groups"
        entityId="p-1"
        messages="permission.groups"
        icon={null}
      />
    );
    expect(screen.getByText('Finance')).toBeDefined();
    expect(screen.queryByTestId('user-label-email')).toBeNull();
  });

  it('asks for the first page of ten and pages through the rest', () => {
    Object.assign(page, { items: users(10), totalCount: 23 });
    renderCard();
    expect(useRelationPage).toHaveBeenLastCalledWith(
      { entity: 'group', relation: 'users' },
      'g-1',
      { page: 1, limit: 10 }
    );

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(useRelationPage).toHaveBeenLastCalledWith(
      { entity: 'group', relation: 'users' },
      'g-1',
      { page: 2, limit: 10 }
    );
  });

  it('says "Not available" when the viewer may not list the related entities', () => {
    Object.assign(page, { error: true, totalCount: 0 });
    renderCard();
    expect(screen.getByTestId('relation-list-unavailable').textContent).toBe(
      'common.relationPreview.notAvailable'
    );
  });

  it('shows its empty state when nothing is related', () => {
    Object.assign(page, { items: [], totalCount: 0 });
    renderCard();
    expect(screen.getByText('group.members.empty')).toBeDefined();
  });
});
