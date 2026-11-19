// @vitest-environment jsdom
import { Tenant } from '@grantjs/schema';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ADDRESS = 'holder@example.test';
const state = {
  scope: { tenant: Tenant.OrganizationProject as Tenant, id: 'org-1:project-1' },
  grants: { SetEmail: true, LinkIdentity: true } as Record<string, boolean>,
  userToSetEmail: { id: 'user-1', name: 'Shell', authenticationMethods: [] } as {
    id: string;
    name: string;
    authenticationMethods?: Array<{ provider: string; providerId: string }>;
  } | null,
};
const setUserToSetEmail = vi.fn((user: null) => {
  state.userToSetEmail = user;
});
const setProjectUserEmail = vi.fn();
const linkProjectUserIdentity = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
    const full = namespace ? `${namespace}.${key}` : key;
    return values ? `${full} ${Object.values(values).join(' ')}` : full;
  },
}));

vi.mock('@grantjs/client/react', () => ({
  useGrant: (_resource: string, action: string, options: { returnLoading?: boolean }) =>
    options.returnLoading
      ? { isGranted: state.grants[action] ?? false, isLoading: false }
      : (state.grants[action] ?? false),
}));

vi.mock('@/hooks/auth', () => ({ useRequiresEmailVerificationForMutation: () => false }));
vi.mock('@/hooks/common', () => ({ useScopeFromParams: () => state.scope }));
vi.mock('@/hooks/users', () => ({
  useUserMutations: () => ({ setProjectUserEmail, linkProjectUserIdentity }),
}));
vi.mock('@/stores/users.store', () => ({
  useUsersStore: (
    select: (s: { userToSetEmail: unknown; setUserToSetEmail: unknown }) => unknown
  ) => select({ userToSetEmail: state.userToSetEmail, setUserToSetEmail }),
}));

// The form itself is FormDialog's concern: a button that submits the address is enough here.
vi.mock('@/components/common', () => ({
  EditDialog: ({
    entity,
    onUpdate,
  }: {
    entity: { id: string } | null;
    onUpdate: (id: string, values: { email: string }) => Promise<unknown>;
  }) =>
    entity ? (
      <button type="button" onClick={() => onUpdate(entity.id, { email: ADDRESS }).catch(() => {})}>
        submit-email
      </button>
    ) : null,
}));

import { UserSetEmailDialog } from './user-set-email-dialog';

/** The set-email mutation refuses with a conflict, as the hook reports it. */
function refuseWithConflict() {
  setProjectUserEmail.mockImplementation(
    async (_input: unknown, options?: { onConflict?: () => void }) => {
      options?.onConflict?.();
      throw new Error('conflict');
    }
  );
}

describe('UserSetEmailDialog identity link step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };
    state.grants = { SetEmail: true, LinkIdentity: true };
    state.userToSetEmail = { id: 'user-1', name: 'Shell', authenticationMethods: [] };
  });

  it('offers the link on a conflict and links on confirm', async () => {
    refuseWithConflict();
    linkProjectUserIdentity.mockResolvedValue({ id: 'holder-1' });
    render(<UserSetEmailDialog />);

    fireEvent.click(screen.getByText('submit-email'));
    expect(await screen.findByText('users.linkIdentityDialog.title')).toBeTruthy();
    expect(screen.getByText(`users.linkIdentityDialog.description ${ADDRESS}`)).toBeTruthy();

    fireEvent.click(screen.getByText('users.linkIdentityDialog.confirm'));
    await waitFor(() =>
      expect(linkProjectUserIdentity).toHaveBeenCalledWith({
        userId: 'user-1',
        email: ADDRESS,
        scope: state.scope,
      })
    );
    await waitFor(() => expect(setUserToSetEmail).toHaveBeenCalledWith(null));
  });

  it('cancelling the link leaves the set-email form open and links nothing', async () => {
    refuseWithConflict();
    render(<UserSetEmailDialog />);

    fireEvent.click(screen.getByText('submit-email'));
    fireEvent.click(await screen.findByText('users.linkIdentityDialog.cancel'));

    await waitFor(() => expect(screen.queryByText('users.linkIdentityDialog.title')).toBeNull());
    expect(linkProjectUserIdentity).not.toHaveBeenCalled();
    expect(setUserToSetEmail).not.toHaveBeenCalled();
  });

  it('does not ask the hook to hand over a conflict without the LinkIdentity permission', async () => {
    state.grants = { SetEmail: true, LinkIdentity: false };
    setProjectUserEmail.mockRejectedValue(new Error('conflict'));
    render(<UserSetEmailDialog />);

    fireEvent.click(screen.getByText('submit-email'));
    await waitFor(() => expect(setProjectUserEmail).toHaveBeenCalled());

    expect(setProjectUserEmail.mock.calls[0][1]).toBeUndefined();
    expect(screen.queryByText('users.linkIdentityDialog.title')).toBeNull();
  });

  it('does not offer the link to a user with its own sign-in, and says why in the toast', async () => {
    state.userToSetEmail = {
      id: 'user-1',
      name: 'Member',
      authenticationMethods: [{ provider: 'email', providerId: 'member@example.test' }],
    };
    setProjectUserEmail.mockRejectedValue(new Error('conflict'));
    render(<UserSetEmailDialog />);

    fireEvent.click(screen.getByText('submit-email'));
    await waitFor(() => expect(setProjectUserEmail).toHaveBeenCalled());

    expect(setProjectUserEmail.mock.calls[0][1]).toEqual({
      conflictDescription: 'users.notifications.setEmailConflictHasSignIn',
    });
    expect(screen.queryByText('users.linkIdentityDialog.title')).toBeNull();
  });

  it('does not offer the link outside an organization project', async () => {
    state.scope = { tenant: Tenant.AccountProject, id: 'account-1:project-1' };
    setProjectUserEmail.mockRejectedValue(new Error('conflict'));
    render(<UserSetEmailDialog />);

    fireEvent.click(screen.getByText('submit-email'));
    await waitFor(() => expect(setProjectUserEmail).toHaveBeenCalled());

    expect(setProjectUserEmail.mock.calls[0][1]).toBeUndefined();
  });
});
