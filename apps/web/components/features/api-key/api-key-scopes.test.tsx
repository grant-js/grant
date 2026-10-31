// @vitest-environment jsdom

import type { ApiKey } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };
const setApiKeyPermissions = vi.fn();
const state = { canUpdate: true };

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

vi.mock('@grantjs/client/react', () => ({
  useGrant: () => state.canUpdate,
}));

vi.mock('@/hooks/common', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/common')>()),
  useScopeFromParams: () => scope,
}));

function permission(id: string, action: string) {
  return {
    id,
    name: `user ${action}`,
    action,
    description: null,
    resource: { id: 'r1', slug: 'user', name: 'user' },
  };
}

const cohortPermissions = [
  { machineOnly: false, permission: permission('perm-query', 'query') },
  { machineOnly: false, permission: permission('perm-read', 'read') },
  { machineOnly: false, permission: permission('perm-update', 'update') },
];

vi.mock('@/hooks/api-keys', () => ({
  useApiKeyMutations: () => ({ setApiKeyPermissions }),
  useApiKeyAttachableGrants: () => ({
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    permissions: cohortPermissions,
    roles: [{ id: 'role-dev', name: 'Developer' }],
    cohort: {
      permissionIds: new Set(cohortPermissions.map((entry) => entry.permission.id)),
      roleIds: new Set(['role-dev']),
    },
  }),
  // the role grants perm-query and perm-outside; the caller may attach only perm-query
  useApiKeyRolePermissions: () => ({
    loading: false,
    error: undefined,
    role: { id: 'role-dev' },
    permissionIds: ['perm-query', 'perm-outside'],
    permissions: [permission('perm-query', 'query'), permission('perm-outside', 'delete')],
  }),
}));

const { ApiKeyScopes } = await import('./api-key-scopes');

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

beforeEach(() => {
  setApiKeyPermissions.mockReset();
  setApiKeyPermissions.mockResolvedValue({});
  state.canUpdate = true;
});

const baseKey = {
  id: 'key-1',
  clientId: 'client-1',
  isRevoked: false,
} as ApiKey;

const roleKey = { ...baseKey, role: { id: 'role-dev', name: 'Developer' }, permissions: null };
const scopeKey = {
  ...baseKey,
  role: null,
  permissions: [permission('perm-query', 'query'), permission('perm-read', 'read')],
};

function renderCard(apiKey: ApiKey) {
  const view = render(
    <TooltipProvider>
      <ApiKeyScopes apiKey={apiKey} />
    </TooltipProvider>
  );
  return {
    ...view,
    update: (next: ApiKey) =>
      view.rerender(
        <TooltipProvider>
          <ApiKeyScopes apiKey={next} />
        </TooltipProvider>
      ),
  };
}

const convertButton = () =>
  screen.queryByRole('button', { name: 'user.apiKeys.detail.scopes.convert' });

describe('ApiKeyScopes of a role key', () => {
  it('shows the role permissions read-only, with the governing note and no toggle', () => {
    renderCard(roleKey as ApiKey);

    expect(screen.getByText(/scopes.roleNotice Developer/)).toBeInTheDocument();
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toBeDisabled();
    }
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('asks for confirmation before converting and calls the mutation once, bounded by the caller', async () => {
    const { update } = renderCard(roleKey as ApiKey);

    fireEvent.click(convertButton()!);
    const dialog = await screen.findByRole('alertdialog');
    expect(setApiKeyPermissions).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/oneWay/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /convertDialog.cancel/ }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(setApiKeyPermissions).not.toHaveBeenCalled();

    fireEvent.click(convertButton()!);
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: /convertDialog.confirm/,
      })
    );

    await waitFor(() => expect(setApiKeyPermissions).toHaveBeenCalledTimes(1));
    expect(setApiKeyPermissions).toHaveBeenCalledWith({
      scope,
      id: 'key-1',
      permissionIds: ['perm-query'],
    });

    // once the key carries permissions the card is in scope mode: editable, no conversion
    update(scopeKey as ApiKey);
    await waitFor(() => expect(convertButton()).toBeNull());
    expect(screen.getByRole('checkbox', { name: /table.select user read/ })).toBeEnabled();
  });

  it('offers no conversion without ApiKey:Update', () => {
    state.canUpdate = false;
    renderCard(roleKey as ApiKey);

    expect(convertButton()).toBeNull();
  });

  it('offers no conversion for a role the caller does not cover', () => {
    renderCard({ ...roleKey, role: { id: 'role-owner', name: 'Owner' } } as ApiKey);

    expect(convertButton()).toBeNull();
  });

  it('offers no conversion for a revoked key', () => {
    renderCard({ ...roleKey, isRevoked: true } as ApiKey);

    expect(convertButton()).toBeNull();
  });
});

describe('ApiKeyScopes of a scope key', () => {
  it('saves a toggle in place with the whole next set', async () => {
    renderCard(scopeKey as ApiKey);

    fireEvent.click(screen.getByRole('checkbox', { name: /table.select user update/ }));

    await waitFor(() => expect(setApiKeyPermissions).toHaveBeenCalledTimes(1));
    expect(setApiKeyPermissions).toHaveBeenCalledWith({
      scope,
      id: 'key-1',
      permissionIds: ['perm-query', 'perm-read', 'perm-update'],
    });
  });

  it('keeps the last permission: it cannot be unchecked', () => {
    renderCard({ ...scopeKey, permissions: [permission('perm-read', 'read')] } as ApiKey);

    expect(screen.getByRole('checkbox', { name: /table.select user read/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /table.select user query/ })).toBeEnabled();
  });

  it('is read-only when the key carries a permission the caller may not attach', () => {
    renderCard({
      ...scopeKey,
      permissions: [permission('perm-query', 'query'), permission('perm-foreign', 'export')],
    } as ApiKey);

    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toBeDisabled();
    }
  });

  it('is read-only without ApiKey:Update and for a revoked key', () => {
    state.canUpdate = false;
    const { unmount } = renderCard(scopeKey as ApiKey);
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
    unmount();

    state.canUpdate = true;
    renderCard({ ...scopeKey, isRevoked: true } as ApiKey);
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
    expect(setApiKeyPermissions).not.toHaveBeenCalled();
  });
});
