// @vitest-environment jsdom

import { Tenant } from '@grantjs/schema';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };
const createApiKey = vi.fn();
const push = vi.fn();
const back = vi.fn();

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
  useParams: () => ({ organizationId: 'org-1', projectId: 'project-1' }),
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
    roles: [{ id: 'role-dev', name: 'Developer', description: null }],
    permissions: [
      {
        machineOnly: false,
        permission: {
          id: 'perm-query',
          name: 'user query',
          action: 'query',
          description: null,
          resource: { id: 'r1', slug: 'user', name: 'user' },
        },
      },
      {
        machineOnly: false,
        permission: {
          id: 'perm-read',
          name: 'user read',
          action: 'read',
          description: null,
          resource: { id: 'r1', slug: 'user', name: 'user' },
        },
      },
    ],
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
    expect(screen.queryByText('user.apiKeys.scopes.title')).toBeNull();
    expect(submitButton()).toBeDisabled();
  });

  it('shows the role card only after choosing a role, and keeps submit disabled until one is picked', () => {
    renderViewer();

    fireEvent.click(kindOption('role'));

    expect(screen.getByText('user.apiKeys.roleCard.title')).toBeInTheDocument();
    expect(screen.queryByText('user.apiKeys.scopes.title')).toBeNull();
    expect(submitButton()).toBeDisabled();
  });

  it('shows the scope picker only after choosing scopes, and enables submit with one scope', async () => {
    renderViewer();

    fireEvent.click(kindOption('scopes'));

    expect(screen.getByText('user.apiKeys.scopes.title')).toBeInTheDocument();
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
});
