import {
  AccountType,
  OrganizationInvitationStatus,
  Tenant,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationInvitationsHandler } from '@/handlers/organization-invitations.handler';
import { verifySecret } from '@/lib/token.lib';

const tx = {};
const organizationId = 'organization-1';
const roleId = 'role-1';
const inviteeEmail = 'invitee@example.com';
const inviterId = 'inviter-1';

const mockOrganizationInvitations = {
  validateInvitationRolePermission: vi.fn(),
  isUserInOrganization: vi.fn(),
  checkPendingInvitation: vi.fn(),
  createInvitation: vi.fn(),
  getInvitationByToken: vi.fn(),
  updateInvitation: vi.fn(),
};
const mockUserAuthenticationMethods = {
  getUserAuthenticationMethodByProvider: vi.fn(),
  getUserAuthenticationMethodByEmail: vi.fn(),
};
const mockOrganizationRoles = { getOrganizationRoles: vi.fn() };
const mockOrganizations = { getOrganizations: vi.fn() };
const mockUsers = { getUsers: vi.fn() };
const mockRoles = { getRoles: vi.fn() };
const mockEmail = { sendInvitation: vi.fn() };
const mockAccounts = { createAccount: vi.fn() };
const mockOrganizationUsers = { addOrganizationUser: vi.fn() };
const mockUserRoles = { addUserRole: vi.fn(), getUserRoles: vi.fn() };
const mockAuth = { getAuth: vi.fn() };
const mockAccountRoles = { seedAccountRoles: vi.fn() };
const mockWithTransaction = vi.fn((fn: (transaction: unknown) => Promise<unknown>) => fn(tx));
const mockDb = { withTransaction: mockWithTransaction };

function createHandler(): OrganizationInvitationsHandler {
  return new OrganizationInvitationsHandler(
    mockOrganizationInvitations as never,
    mockUserAuthenticationMethods as never,
    mockOrganizationRoles as never,
    mockOrganizations as never,
    mockUsers as never,
    mockRoles as never,
    mockEmail as never,
    mockAccounts as never,
    mockOrganizationUsers as never,
    mockUserRoles as never,
    mockAuth as never,
    mockAccountRoles as never,
    mockDb as never
  );
}

describe('OrganizationInvitationsHandler email proof links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation((fn: (transaction: unknown) => Promise<unknown>) =>
      fn(tx)
    );
    mockOrganizationInvitations.validateInvitationRolePermission.mockResolvedValue(undefined);
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
    mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
    mockOrganizationInvitations.checkPendingInvitation.mockResolvedValue(null);
    mockOrganizationRoles.getOrganizationRoles.mockResolvedValue([{ roleId }]);
    mockOrganizations.getOrganizations.mockResolvedValue({
      organizations: [{ id: organizationId, name: 'Acme' }],
    });
    mockAuth.getAuth.mockReturnValue({ userId: inviterId });
    mockUsers.getUsers.mockResolvedValue({ users: [{ id: inviterId, name: 'Admin' }] });
    mockRoles.getRoles.mockResolvedValue({ roles: [{ id: roleId, name: 'roles.names.viewer' }] });
    mockOrganizationInvitations.createInvitation.mockImplementation(async (input) => ({
      id: 'invitation-1',
      ...input,
    }));
    mockOrganizationInvitations.getInvitationByToken.mockResolvedValue({
      id: 'invitation-1',
      organizationId,
      email: inviteeEmail,
      roleId,
      token: 'invitation-token',
      status: OrganizationInvitationStatus.Pending,
      expiresAt: new Date(Date.now() + 60_000),
      invitedBy: inviterId,
    });
    mockOrganizationInvitations.updateInvitation.mockImplementation(async (id, input) => ({
      id,
      organizationId,
      email: inviteeEmail,
      roleId,
      token: 'invitation-token',
      status: OrganizationInvitationStatus.Pending,
      expiresAt: new Date(Date.now() + 60_000),
      invitedBy: inviterId,
      ...input,
    }));
    mockEmail.sendInvitation.mockResolvedValue(undefined);
    mockAccounts.createAccount.mockResolvedValue({
      id: 'organization-account-1',
      type: AccountType.Organization,
    });
    mockAccountRoles.seedAccountRoles.mockResolvedValue([{ role: { id: 'account-owner-role-1' } }]);
    mockUserRoles.getUserRoles.mockResolvedValue([]);
    mockUserRoles.addUserRole.mockResolvedValue({});
    mockOrganizationUsers.addOrganizationUser.mockResolvedValue({});
  });

  it('sends emailed invitations with a separate proof token and stores only its hash', async () => {
    await createHandler().inviteMember({
      scope: { tenant: Tenant.Organization, id: organizationId },
      email: inviteeEmail,
      roleId,
    });

    const createInput = mockOrganizationInvitations.createInvitation.mock.calls[0][0];
    expect(createInput.emailVerificationProofTokenHash).toEqual(expect.any(String));
    expect(createInput.emailVerificationProofTokenHash).not.toBe(createInput.token);

    const emailInput = mockEmail.sendInvitation.mock.calls[0][0];
    const invitationUrl = new URL(emailInput.invitationUrl);
    expect(invitationUrl.pathname).toContain(`/invitations/${createInput.token}`);
    const emailProof = invitationUrl.searchParams.get('emailProof');
    expect(emailProof).toBeTruthy();
    expect(verifySecret(emailProof!, createInput.emailVerificationProofTokenHash)).toBe(true);
  });

  it('rejects an authenticated user when the invitation email has not registered yet', async () => {
    await expect(createHandler().acceptInvitation({ token: 'invitation-token' })).rejects.toThrow(
      'Authenticated user does not match invitation email'
    );

    expect(mockOrganizationInvitations.updateInvitation).not.toHaveBeenCalled();
  });

  it('accepts a GitHub-authenticated user when the GitHub email matches the invitation', async () => {
    mockAuth.getAuth.mockReturnValue({ userId: 'github-user-1', isVerified: true });
    mockUserAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
      id: 'github-auth-1',
      userId: 'github-user-1',
      provider: UserAuthenticationMethodProvider.Github,
      isVerified: true,
    });
    mockUsers.getUsers
      .mockResolvedValueOnce({
        users: [
          {
            id: 'github-user-1',
            accounts: [{ id: 'personal-account-1', type: AccountType.Personal }],
          },
        ],
      })
      .mockResolvedValueOnce({
        users: [
          {
            id: 'github-user-1',
            accounts: [
              { id: 'personal-account-1', type: AccountType.Personal },
              { id: 'organization-account-1', type: AccountType.Organization },
            ],
          },
        ],
      });

    const result = await createHandler().acceptInvitation({ token: 'invitation-token' });

    expect(result.requiresRegistration).toBe(false);
    expect(mockAccounts.createAccount).toHaveBeenCalledWith(
      {
        type: AccountType.Organization,
        ownerId: 'github-user-1',
      },
      tx
    );
    expect(mockOrganizationUsers.addOrganizationUser).toHaveBeenCalledWith(
      {
        organizationId,
        userId: 'github-user-1',
        roleId,
      },
      tx
    );
    expect(mockOrganizationInvitations.updateInvitation).toHaveBeenCalledWith(
      'invitation-1',
      expect.objectContaining({ status: OrganizationInvitationStatus.Accepted }),
      tx
    );
  });
});
