// @vitest-environment jsdom

import { Tenant } from '@grantjs/schema';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const route = {
  organizationId: 'org-1' as string | undefined,
  accountId: undefined as string | undefined,
  projectId: 'project-1',
};
const scope = { tenant: Tenant.OrganizationProject as Tenant, id: 'org-1:project-1' };
const createApiKey = vi.fn();
const push = vi.fn();
const back = vi.fn();

function attachablePermission(id: string, slug: string, action: string) {
  return {
    machineOnly: false,
    permission: {
      id,
      name: `${slug} ${action}`,
      action,
      description: null,
      resource: { id: `r-${slug}`, slug, name: slug },
    },
  };
}

const defaultRoles = [
  { id: 'role-dev', name: 'Developer', description: null },
  { id: 'role-owner', name: 'Owner', description: null },
];
const defaultPermissions = [
  attachablePermission('perm-query', 'user', 'query'),
  attachablePermission('perm-read', 'user', 'read'),
];
const attachable = {
  roles: [...defaultRoles],
  permissions: [...defaultPermissions],
};

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

vi.mock('next/navigation', () => ({
  useParams: () => ({
    organizationId: route.organizationId,
    accountId: route.accountId,
    projectId: route.projectId,
  }),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push, back }),
}));

vi.mock('@grantjs/client/react', () => ({
  useGrant: () => ({ isGranted: true, isLoading: false }),
}));

vi.mock('@/hooks', () => ({ usePageTitle: () => {} }));

vi.mock('@/hooks/auth', () => ({
  useRequiresEmailVerificationForMutation: () => false,
}));

vi.mock('@/hooks/common', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/common')>()),
  useScopeFromParams: () => scope,
}));

vi.mock('@/hooks/api-keys', () => ({
  useApiKeyMutations: () => ({ createApiKey }),
  useApiKeyAttachableGrants: () => ({
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    cohort: null,
    roles: attachable.roles,
    permissions: attachable.permissions,
  }),
}));

vi.mock('@/components/layout', () => ({
  DashboardLayout: ({ actions, children }: { actions?: ReactNode; children: ReactNode }) => (
    <div>
      <div data-testid="actions">{actions}</div>
      {children}
    </div>
  ),
  FeatureDetailLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const { ApiKeyCreateViewer } = await import('./api-key-create-viewer');

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
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  createApiKey.mockReset();
  push.mockReset();
  back.mockReset();
  scope.tenant = Tenant.OrganizationProject;
  scope.id = 'org-1:project-1';
  route.organizationId = 'org-1';
  route.accountId = undefined;
  attachable.roles = [...defaultRoles];
  attachable.permissions = [...defaultPermissions];
});

function renderViewer() {
  return render(
    <TooltipProvider>
      <ApiKeyCreateViewer sidebar={null} />
    </TooltipProvider>
  );
}

const submitButton = () =>
  screen.getByRole('button', { name: 'user.apiKeys.createDialog.confirm' });
const kindOption = (kind: 'role' | 'scopes') =>
  screen.getByRole('radio', { name: new RegExp(`user.apiKeys.grantKind.${kind}.title`) });

describe('ApiKeyCreateViewer', () => {
  it('asks for the authorization model first, with no default and nothing below it', () => {
    renderViewer();

    expect(kindOption('role')).toHaveAttribute('aria-checked', 'false');
    expect(kindOption('scopes')).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByText('user.apiKeys.roleCard.title')).toBeNull();
    expect(screen.queryByText('user.apiKeys.scopes.grant.title')).toBeNull();
    expect(submitButton()).toBeDisabled();
  });

  it('moves between the two options with the arrow keys', async () => {
    renderViewer();

    kindOption('role').focus();
    fireEvent.keyDown(kindOption('role'), { key: 'ArrowRight' });

    // Radix moves the roving focus on the next tick
    await waitFor(() => expect(kindOption('scopes')).toHaveFocus());
  });

  it('shows the role card only after choosing a role, and keeps submit disabled until one is picked', () => {
    renderViewer();

    fireEvent.click(kindOption('role'));

    expect(screen.getByText('user.apiKeys.roleCard.title')).toBeInTheDocument();
    expect(screen.queryByText('user.apiKeys.scopes.grant.title')).toBeNull();
    expect(submitButton()).toBeDisabled();
  });

  it('shows the scope picker only after choosing scopes, and enables submit with one scope', async () => {
    renderViewer();

    fireEvent.click(kindOption('scopes'));

    expect(screen.getByText('user.apiKeys.scopes.grant.title')).toBeInTheDocument();
    expect(screen.queryByText('user.apiKeys.scopes.project.title')).toBeNull();
    expect(screen.queryByText('user.apiKeys.roleCard.title')).toBeNull();
    expect(submitButton()).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /scopes.table.select user query/ }));
    await waitFor(() => expect(submitButton()).toBeEnabled());

    fireEvent.click(screen.getByRole('checkbox', { name: /scopes.table.select user query/ }));
    await waitFor(() => expect(submitButton()).toBeDisabled());
  });

  it('clears the scopes when switching to a role, and the role when switching back', async () => {
    renderViewer();

    fireEvent.click(kindOption('scopes'));
    fireEvent.click(screen.getByRole('checkbox', { name: /scopes.table.select user query/ }));
    await waitFor(() => expect(submitButton()).toBeEnabled());

    fireEvent.click(kindOption('role'));
    await waitFor(() => expect(submitButton()).toBeDisabled());

    fireEvent.click(kindOption('scopes'));
    expect(
      screen.getByRole('checkbox', { name: /scopes.table.select user query/ })
    ).toHaveAttribute('aria-checked', 'false');
    expect(submitButton()).toBeDisabled();
  });

  it('creates the key with the picked scopes and no role, then shows the secret once', async () => {
    createApiKey.mockResolvedValue({
      id: 'key-1',
      clientId: 'client-1',
      clientSecret: 'secret-1',
    });
    renderViewer();

    fireEvent.click(kindOption('scopes'));
    fireEvent.click(screen.getByRole('checkbox', { name: /scopes.groups.allActionsFor user$/ }));
    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('secret-1')).toBeInTheDocument();

    expect(createApiKey).toHaveBeenCalledTimes(1);
    const input = createApiKey.mock.calls[0][0];
    expect(input.scope).toEqual(scope);
    expect(input.permissionIds.sort()).toEqual(['perm-query', 'perm-read']);
    expect(input).not.toHaveProperty('roleId');
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /close/i }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        '/dashboard/organizations/org-1/projects/project-1/api-keys/key-1'
      )
    );
  });

  it('creates the key with the picked role and no permissions', async () => {
    createApiKey.mockResolvedValue({ id: 'key-2', clientId: 'c', clientSecret: 's' });
    renderViewer();

    fireEvent.click(kindOption('role'));
    fireEvent.click(screen.getByRole('combobox', { name: 'user.apiKeys.roleCard.label' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Developer' }));
    await waitFor(() => expect(submitButton()).toBeEnabled());
    fireEvent.click(submitButton());

    await waitFor(() => expect(createApiKey).toHaveBeenCalledTimes(1));
    const input = createApiKey.mock.calls[0][0];
    expect(input.roleId).toBe('role-dev');
    expect(input).not.toHaveProperty('permissionIds');
  });

  it('lists Owner when attachable grants include it', async () => {
    renderViewer();

    fireEvent.click(kindOption('role'));
    fireEvent.click(screen.getByRole('combobox', { name: 'user.apiKeys.roleCard.label' }));

    expect(await screen.findByRole('option', { name: 'Owner' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Developer' })).toBeInTheDocument();
  });

  it('splits Grant and Project scopes and keeps a custom user-like slug off the Grant card', async () => {
    attachable.permissions = [
      attachablePermission('user-query', 'User', 'Query'),
      attachablePermission('session-query', 'UserSession', 'Query'),
      attachablePermission('custom-user', 'user-directory', 'Read'),
    ];
    renderViewer();
    fireEvent.click(kindOption('scopes'));

    expect(screen.getByText('user.apiKeys.scopes.grant.title')).toBeInTheDocument();
    expect(screen.getByText('user.apiKeys.scopes.project.title')).toBeInTheDocument();

    const grantCard = screen
      .getByText('user.apiKeys.scopes.grant.title')
      .closest('[data-slot="card"]') as HTMLElement;
    const projectCard = screen
      .getByText('user.apiKeys.scopes.project.title')
      .closest('[data-slot="card"]') as HTMLElement;

    expect(grantCard).toBeTruthy();
    expect(projectCard).toBeTruthy();
    expect(within(grantCard).getByText('User:Query')).toBeInTheDocument();
    expect(within(grantCard).getByText('UserSession:Query')).toBeInTheDocument();
    expect(within(grantCard).queryByText('user-directory:Read')).toBeNull();
    expect(within(projectCard).getByText('user-directory:Read')).toBeInTheDocument();

    const searches = screen.getAllByPlaceholderText('user.apiKeys.scopes.search.placeholder');
    expect(searches).toHaveLength(2);
    fireEvent.change(searches[0], { target: { value: 'session' } });

    await waitFor(() => {
      expect(within(grantCard).queryByText('User:Query')).toBeNull();
      expect(within(grantCard).getByText('UserSession:Query')).toBeInTheDocument();
    });
    expect(within(projectCard).getByText('user-directory:Read')).toBeInTheDocument();
  });

  it('uses Grant vs Project card copy on a personal-account project', () => {
    scope.tenant = Tenant.AccountProject;
    scope.id = 'account-1:project-1';
    route.organizationId = undefined;
    route.accountId = 'account-1';
    attachable.permissions = [
      ...defaultPermissions,
      attachablePermission('custom-user', 'user-directory', 'Read'),
    ];
    renderViewer();
    fireEvent.click(kindOption('scopes'));

    const grantCard = screen
      .getByText('user.apiKeys.scopes.grant.title')
      .closest('[data-slot="card"]');
    const projectCard = screen
      .getByText('user.apiKeys.scopes.project.title')
      .closest('[data-slot="card"]');

    expect(grantCard).toHaveTextContent(/Grant scopes|scopes\.grant/);
    expect(projectCard).toHaveTextContent(/Project scopes|scopes\.project/);
    expect(`${grantCard?.textContent ?? ''}\n${projectCard?.textContent ?? ''}`).not.toMatch(
      /organi[sz]ation/i
    );
  });
});
