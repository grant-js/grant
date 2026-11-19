// @vitest-environment jsdom
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const users = [
  {
    id: 'u-email',
    name: 'Ada',
    authenticationMethods: [
      { provider: UserAuthenticationMethodProvider.Email, providerId: 'ada@example.test' },
    ],
    metadata: {},
  },
  {
    id: 'u-github',
    name: 'Grace',
    authenticationMethods: [
      { provider: UserAuthenticationMethodProvider.Github, providerId: '42' },
    ],
    metadata: {},
  },
];

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

// `@/components/common` reaches `@/i18n/navigation`, which the test runner cannot resolve.
vi.mock('@/i18n/navigation', () => ({
  Link: 'a',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('@/stores/users.store', () => ({
  useUsersStore: (select: (s: Record<string, unknown>) => unknown) =>
    select({ limit: 10, search: '', users, loading: false, hideSyntheticEntities: false }),
}));

// The parts of a row that are not about the email.
vi.mock('./user-actions', () => ({ UserActions: () => null }));
vi.mock('./user-audit', () => ({ UserAudit: () => null }));
vi.mock('./user-navigation-button', () => ({ UserNavigationButton: () => null }));

// Grids and tables are covered by their own tests: render what each row hands them.
vi.mock('@/components/common', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/common');
  return {
    ...actual,
    CardGrid: ({
      entities,
      renderHeader,
    }: {
      entities: Array<{ id: string }>;
      renderHeader: (e: unknown) => unknown;
    }) => (
      <div>
        {entities.map((e) => (
          <div key={e.id} data-testid={`card-${e.id}`}>
            {renderHeader(e) as never}
          </div>
        ))}
      </div>
    ),
    DataTable: ({
      data,
      columns,
    }: {
      data: Array<{ id: string }>;
      columns: Array<{ key: string; render: (e: unknown) => unknown }>;
    }) => (
      <table>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} data-testid={`row-${row.id}`}>
              {columns.map((c) => (
                <td key={c.key} data-column={c.key}>
                  {c.render(row) as never}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
  };
});

vi.mock('@/hooks/common', () => ({
  useRelationPreview: () => ({
    load: vi.fn(),
    items: undefined,
    loading: false,
    error: false,
    called: false,
  }),
  usePageCardFields: () => ({ arrange: <T,>(items: T[]) => items }),
  usePageTableColumnVisibility: (columns: unknown[]) => ({
    visibleColumns: columns,
    filterSkeletonColumns: (c: unknown[]) => c,
  }),
}));

const { UserCards } = await import('./user-cards');
const { UserTable } = await import('./user-table');

describe('user email in the users list', () => {
  it("shows the Email method's address as the card subtitle, and nothing without one", () => {
    render(<UserCards />);
    expect(screen.getByTestId('card-u-email').textContent).toContain('ada@example.test');
    expect(screen.getByTestId('card-u-github').textContent).not.toContain('42');
  });

  it('has an Email column after Name, empty without an Email method', () => {
    render(<UserTable />);
    const cells = (id: string) =>
      Array.from(screen.getByTestId(`row-${id}`).querySelectorAll('td')).map((td) =>
        td.getAttribute('data-column')
      );
    expect(cells('u-email').indexOf('email')).toBe(cells('u-email').indexOf('name') + 1);
    const emailCell = (id: string) =>
      screen.getByTestId(`row-${id}`).querySelector('td[data-column="email"]')!;
    expect(emailCell('u-email').textContent).toBe('ada@example.test');
    expect(emailCell('u-github').textContent).toBe('');
  });
});
