import { MILLISECONDS_PER_DAY } from '@grantjs/constants';
import {
  AcceptInvitationInput,
  AcceptInvitationResult,
  Account,
  AccountType,
  GetInvitationQueryVariables,
  InviteMemberInput,
  OrganizationInvitation,
  OrganizationInvitationPage,
  OrganizationInvitationStatus,
  QueryOrganizationInvitationsArgs,
  Tenant,
  UpdateOrganizationInvitationInput,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

import { config } from '@/config';
import { defaultLocale } from '@/i18n';
import { AuthenticationError, BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { generateSecureTokenMs } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import type {
  IAccountRoleService,
  IAccountService,
  IAuthService,
  IEmailService,
  ILogger,
  IOrganizationInvitationService,
  IOrganizationRoleService,
  IOrganizationService,
  IOrganizationUserService,
  IRoleService,
  ITransactionalConnection,
  IUserAuthenticationMethodService,
  IUserRoleService,
  IUserService,
} from '@grantjs/core';

export class OrganizationInvitationsHandler {
  private readonly logger = createLogger('OrganizationInvitationsHandler');

  constructor(
    private readonly organizationInvitations: IOrganizationInvitationService,
    private readonly userAuthenticationMethods: IUserAuthenticationMethodService,
    private readonly organizationRoles: IOrganizationRoleService,
    private readonly organizations: IOrganizationService,
    private readonly users: IUserService,
    private readonly roles: IRoleService,
    private readonly email: IEmailService,
    private readonly accounts: IAccountService,
    private readonly organizationUsers: IOrganizationUserService,
    private readonly userRoles: IUserRoleService,
    private readonly auth: IAuthService,
    private readonly accountRoles: IAccountRoleService,
    private readonly db: ITransactionalConnection<Transaction>
  ) {}

  /**
   * Invite a member to an organization
   */
  public async inviteMember(
    params: InviteMemberInput,
    locale?: string,
    requestLogger?: ILogger
  ): Promise<OrganizationInvitation> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { scope, email, roleId } = params;
      const { id: organizationId, tenant } = scope;

      if (tenant !== Tenant.Organization) {
        throw new BadRequestError('Invalid scope');
      }

      // Validate role hierarchy permission (uses current user from service context)
      await this.organizationInvitations.validateInvitationRolePermission(
        organizationId,
        roleId,
        tx
      );

      // 1. Check if user authentication method exists for this email
      const existingAuthMethod =
        await this.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
          UserAuthenticationMethodProvider.Email,
          email,
          undefined,
          tx
        );

      // 2. If user exists, check if already in organization
      if (existingAuthMethod) {
        const isInOrg = await this.organizationInvitations.isUserInOrganization(
          organizationId,
          existingAuthMethod.userId,
          tx
        );

        if (isInOrg) {
          throw new ConflictError(
            'User already part of the organization',
            'OrganizationUser',
            'userId'
          );
        }
      }

      // 3. Check for existing pending invitation
      const existingInvitation = await this.organizationInvitations.checkPendingInvitation(
        email,
        organizationId,
        tx
      );

      if (existingInvitation) {
        throw new ConflictError('Invitation already sent to this email', 'Invitation', 'email');
      }

      // 4. Verify role exists and belongs to organization
      const organizationRoles = await this.organizationRoles.getOrganizationRoles(
        { organizationId },
        tx
      );
      const roleExists = organizationRoles.some((or) => or.roleId === roleId);
      if (!roleExists) {
        throw new NotFoundError('Role');
      }

      // 5. Get organization and inviter details for email
      const organization = (
        await this.organizations.getOrganizations(
          { ids: [organizationId], limit: 1, requestedFields: [] },
          tx
        )
      ).organizations[0];

      const invitedBy = this.auth.getAuth()?.userId;

      if (!invitedBy) {
        throw new AuthenticationError('Authentication required');
      }

      const inviter = (
        await this.users.getUsers({ ids: [invitedBy], limit: 1, requestedFields: [] }, tx)
      ).users[0];

      const roles = await this.roles.getRoles({ ids: [roleId], limit: 1 });
      const role = roles.roles[0];

      // 6. Create invitation (invitedAt will be set after email is successfully sent)
      const { token, validUntil } = generateSecureTokenMs(7 * MILLISECONDS_PER_DAY); // 7 days
      const expiresAt = new Date(validUntil);

      // Create invitation without invitedAt initially (schema default will set it, but we'll update after email)
      const invitation = await this.organizationInvitations.createInvitation(
        {
          organizationId,
          email,
          roleId,
          token,
          expiresAt,
          invitedBy,
          // invitedAt will be set after email is successfully sent
          status: OrganizationInvitationStatus.Pending,
        },
        tx
      );

      // 7. Send invitation email and update invitedAt only on success
      const localePrefix = locale || defaultLocale;
      const invitationUrl = `${config.security.frontendUrl}/${localePrefix}/invitations/${token}`;

      try {
        await this.email.sendInvitation({
          to: email,
          organizationName: organization.name,
          inviterName: inviter.name,
          invitationUrl,
          roleName: role.name,
          locale,
        });
        // Email sent successfully, update invitedAt to reflect when it was actually sent
        const updatedInvitation = await this.organizationInvitations.updateInvitation(
          invitation.id,
          {
            invitedAt: new Date(),
          } as UpdateOrganizationInvitationInput & { invitedAt: Date },
          tx
        );
        return updatedInvitation as OrganizationInvitation;
      } catch (error) {
        (requestLogger ?? this.logger).error({
          msg: 'Failed to send invitation email',
          err: error,
        });
        // Email failed - invitation exists but email wasn't sent
        // invitedAt remains at schema default (creation time), not when email was sent
        return invitation as OrganizationInvitation;
      }
    });
  }

  /**
   * Accept an organization invitation
   */
  public async acceptInvitation(params: AcceptInvitationInput): Promise<AcceptInvitationResult> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { token, userData } = params;

      // 1. Get invitation
      const invitation = await this.organizationInvitations.getInvitationByToken({ token }, tx);

      if (!invitation || invitation.status !== OrganizationInvitationStatus.Pending) {
        throw new BadRequestError('Invalid or expired invitation');
      }

      if (new Date() > invitation.expiresAt) {
        throw new BadRequestError('Invitation has expired');
      }

      // 2. Check if user authentication method exists
      const userAuthMethod =
        await this.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
          UserAuthenticationMethodProvider.Email,
          invitation.email,
          undefined,
          tx
        );

      let user;
      let isNewUser = false;

      // 3. If user doesn't exist and userData not provided, require registration
      if (!userAuthMethod && !userData) {
        return {
          requiresRegistration: true,
          invitation: invitation as OrganizationInvitation,
          user: null,
          accounts: [],
          isNewUser: false,
        };
      }

      // 4. Create user if doesn't exist
      if (!userAuthMethod && userData) {
        isNewUser = true;

        // Create user
        user = await this.users.createUser({ name: userData.name }, tx);

        // Create authentication method
        const { providerData } = await this.userAuthenticationMethods.processProvider(
          UserAuthenticationMethodProvider.Email,
          invitation.email,
          {
            password: userData.password,
            action: UserAuthenticationEmailProviderAction.Register,
          }
        );

        await this.userAuthenticationMethods.createUserAuthenticationMethod(
          {
            userId: user.id,
            provider: UserAuthenticationMethodProvider.Email,
            providerId: invitation.email,
            providerData,
            isVerified: true, // Auto-verify invited users
          },
          tx
        );

        // Create account and seed account-level roles
        const newOrgAccount = await this.accounts.createAccount(
          {
            type: AccountType.Organization,
            ownerId: user.id,
          },
          tx
        );

        const seededRolesForNewUser = await this.accountRoles.seedAccountRoles(
          newOrgAccount.id,
          tx
        );
        const ownerRoleForNewUser = seededRolesForNewUser[0];
        if (ownerRoleForNewUser) {
          await this.userRoles.addUserRole(
            { userId: user.id, roleId: ownerRoleForNewUser.role.id },
            tx
          );
        }
      } else {
        // Get existing user with accounts
        const usersResult = await this.users.getUsers(
          {
            ids: [userAuthMethod!.userId],
            limit: 1,
            requestedFields: ['accounts'],
          },
          tx
        );
        user = usersResult.users[0];

        // Check if user has an Organization account
        const organizationAccount = user.accounts?.find(
          (acc) => acc.type === AccountType.Organization
        );

        if (!organizationAccount) {
          // User doesn't have Organization account
          // Check account limit (max 2 accounts per user: 1 Personal + 1 Organization)
          // A user can only have 1 Personal account (enforced by unique email registration in createAccount)
          const accountCount = user.accounts?.length || 0;
          if (accountCount >= 2) {
            throw new BadRequestError('User has reached maximum account limit');
          }

          // Create Organization account for existing user
          const newOrgAccount = await this.accounts.createAccount(
            {
              type: AccountType.Organization,
              ownerId: user.id,
            },
            tx
          );

          // Seed account-level roles (creates the account_roles link required for
          // account-scoped permission resolution — mirrors createMySecondaryAccount)
          const seededRoles = await this.accountRoles.seedAccountRoles(newOrgAccount.id, tx);
          const accountOwnerRole = seededRoles[0];
          if (accountOwnerRole) {
            const existingUserRoles = await this.userRoles.getUserRoles({ userId: user.id }, tx);
            const hasOwnerRole = existingUserRoles.some(
              (ur) => ur.roleId === accountOwnerRole.role.id
            );
            if (!hasOwnerRole) {
              await this.userRoles.addUserRole(
                { userId: user.id, roleId: accountOwnerRole.role.id },
                tx
              );
            }
          }
        }
      }

      // 5. Add user to organization
      await this.organizationUsers.addOrganizationUser(
        {
          organizationId: invitation.organizationId,
          userId: user!.id,
        },
        tx
      );

      // 6. Assign role
      await this.userRoles.addUserRole(
        {
          userId: user!.id,
          roleId: invitation.roleId,
        },
        tx
      );

      // 7. Update invitation status
      await this.organizationInvitations.updateInvitation(
        invitation.id,
        {
          status: OrganizationInvitationStatus.Accepted,
          acceptedAt: new Date(),
        },
        tx
      );

      // 8. Fetch all user accounts (after potential account creation)
      const updatedUsersResult = await this.users.getUsers(
        {
          ids: [user!.id],
          limit: 1,
          requestedFields: ['accounts'],
        },
        tx
      );
      const updatedUser = updatedUsersResult.users[0];
      const allAccounts = (updatedUser.accounts || []) as Account[];

      return {
        requiresRegistration: false,
        user: user!,
        accounts: allAccounts,
        isNewUser,
        invitation: invitation as OrganizationInvitation,
      };
    });
  }

  /**
   * Get a single invitation by token (for public invitation acceptance)
   */
  public async getInvitation(
    params: GetInvitationQueryVariables & SelectedFields<OrganizationInvitation>
  ): Promise<OrganizationInvitation | null> {
    const invitation = await this.organizationInvitations.getInvitationByToken(params);
    return invitation as OrganizationInvitation | null;
  }

  /**
   * Get organization invitations
   */
  public async getOrganizationInvitations(
    params: QueryOrganizationInvitationsArgs
  ): Promise<OrganizationInvitationPage> {
    return await this.organizationInvitations.getInvitationsByOrganization(params);
  }

  /**
   * Revoke an invitation
   */
  public async revokeInvitation(id: string): Promise<OrganizationInvitation> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const invitation = await this.organizationInvitations.revokeInvitation(id, tx);
      return invitation as OrganizationInvitation;
    });
  }

  /**
   * Resend invitation email for a pending invitation
   */
  public async resendInvitationEmail(
    id: string,
    locale?: string,
    requestLogger?: ILogger
  ): Promise<OrganizationInvitation> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      // 1. Get invitation by ID
      const invitation = await this.organizationInvitations.getInvitationById(id, tx);

      if (!invitation) {
        throw new NotFoundError('Invitation');
      }

      // 2. Verify invitation is pending
      if (invitation.status !== OrganizationInvitationStatus.Pending) {
        throw new BadRequestError('Can only resend email for pending invitations');
      }

      // 3. Verify invitation hasn't expired
      if (new Date() > invitation.expiresAt) {
        throw new BadRequestError('Invitation has expired');
      }

      // 4. Get organization and inviter details for email
      const organization = (
        await this.organizations.getOrganizations(
          { ids: [invitation.organizationId], limit: 1, requestedFields: [] },
          tx
        )
      ).organizations[0];

      const inviter = (
        await this.users.getUsers(
          { ids: [invitation.invitedBy], limit: 1, requestedFields: [] },
          tx
        )
      ).users[0];

      const roles = await this.roles.getRoles({ ids: [invitation.roleId], limit: 1 });
      const role = roles.roles[0];

      // 5. Resend invitation email (async, fire-and-forget)
      const localePrefix = locale || defaultLocale;
      const invitationUrl = `${config.security.frontendUrl}/${localePrefix}/invitations/${invitation.token}`;

      this.email
        .sendInvitation({
          to: invitation.email,
          organizationName: organization.name,
          inviterName: inviter.name,
          invitationUrl,
          roleName: role.name,
          locale,
        })
        .catch((error) => {
          (requestLogger ?? this.logger).error({
            msg: 'Failed to resend invitation email',
            err: error,
          });
          // Don't throw - invitation still exists
        });

      return invitation as OrganizationInvitation;
    });
  }

  /**
   * Renew an expired invitation
   */
  public async renewInvitation(
    id: string,
    locale?: string,
    requestLogger?: ILogger
  ): Promise<OrganizationInvitation> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      // 1. Get invitation by ID
      const invitation = await this.organizationInvitations.getInvitationById(id, tx);

      if (!invitation) {
        throw new NotFoundError('Invitation');
      }

      // 2. Verify invitation is expired and pending
      const isExpired = new Date() > invitation.expiresAt;
      const isPending = invitation.status === OrganizationInvitationStatus.Pending;

      if (!isPending) {
        throw new BadRequestError('Can only renew pending invitations');
      }

      if (!isExpired) {
        throw new BadRequestError('Can only renew expired invitations');
      }

      // 3. Generate new token and expiration date
      const { token, validUntil } = generateSecureTokenMs(7 * MILLISECONDS_PER_DAY); // 7 days
      const expiresAt = new Date(validUntil);

      // 4. Get organization and inviter details for email (before updating)
      const organization = (
        await this.organizations.getOrganizations(
          { ids: [invitation.organizationId], limit: 1, requestedFields: [] },
          tx
        )
      ).organizations[0];

      const inviter = (
        await this.users.getUsers(
          { ids: [invitation.invitedBy], limit: 1, requestedFields: [] },
          tx
        )
      ).users[0];

      const roles = await this.roles.getRoles({ ids: [invitation.roleId], limit: 1 });
      const role = roles.roles[0];

      // 5. Update invitation with new token and expiration (without invitedAt initially)
      const updatedInvitation = await this.organizationInvitations.updateInvitation(
        id,
        {
          token,
          expiresAt,
          status: OrganizationInvitationStatus.Pending, // Ensure it's pending
        } as UpdateOrganizationInvitationInput & { token: string; expiresAt: Date },
        tx
      );

      // 6. Send invitation email and update invitedAt only on success
      const localePrefix = locale || defaultLocale;
      const invitationUrl = `${config.security.frontendUrl}/${localePrefix}/invitations/${token}`;

      try {
        await this.email.sendInvitation({
          to: invitation.email,
          organizationName: organization.name,
          inviterName: inviter.name,
          invitationUrl,
          roleName: role.name,
          locale,
        });
        // Email sent successfully, now update invitedAt
        const finalInvitation = await this.organizationInvitations.updateInvitation(
          id,
          {
            invitedAt: new Date(),
          } as UpdateOrganizationInvitationInput & { invitedAt: Date },
          tx
        );
        return finalInvitation as OrganizationInvitation;
      } catch (error) {
        (requestLogger ?? this.logger).error({
          msg: 'Failed to send renewal invitation email',
          err: error,
        });
        // Email failed, but invitation was updated with new token/expiration
        // invitedAt remains unchanged (preserves original sent date)
        return updatedInvitation as OrganizationInvitation;
      }
    });
  }
}
