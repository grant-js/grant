import { DbSchema } from '@logusgraphics/grant-database';
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
  UserAuthenticationMethodProvider,
} from '@logusgraphics/grant-schema';

import { config } from '@/config';
import { defaultLocale } from '@/i18n';
import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { slugifySafe } from '@/lib/slugify.lib';
import { generateSecureTokenMs } from '@/lib/token.lib';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { SelectedFields } from '@/services/common';

export class OrganizationInvitationsHandler {
  private readonly logger = createModuleLogger('OrganizationInvitationsHandler');

  constructor(
    readonly services: Services,
    readonly db: DbSchema
  ) {}

  /**
   * Invite a member to an organization
   */
  public async inviteMember(
    params: InviteMemberInput,
    invitedBy: string,
    locale?: string
  ): Promise<OrganizationInvitation> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { organizationId, email, roleId } = params;

      // 1. Check if user authentication method exists for this email
      const existingAuthMethod =
        await this.services.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
          UserAuthenticationMethodProvider.Email,
          email,
          undefined,
          tx
        );

      // 2. If user exists, check if already in organization
      if (existingAuthMethod) {
        const isInOrg = await this.services.organizationInvitations.isUserInOrganization(
          organizationId,
          existingAuthMethod.userId,
          tx
        );

        if (isInOrg) {
          throw new ConflictError(
            'User already part of the organization',
            'errors:conflict.duplicateEntry',
            { resource: 'OrganizationUser', field: 'userId' }
          );
        }
      }

      // 3. Check for existing pending invitation
      const existingInvitation = await this.services.organizationInvitations.checkPendingInvitation(
        email,
        organizationId,
        tx
      );

      if (existingInvitation) {
        throw new ConflictError(
          'Invitation already sent to this email',
          'errors:conflict.duplicateEntry',
          { resource: 'Invitation', field: 'email' }
        );
      }

      // 4. Verify role exists and belongs to organization
      const organizationRoles = await this.services.organizationRoles.getOrganizationRoles(
        { organizationId },
        tx
      );
      const roleExists = organizationRoles.some((or) => or.roleId === roleId);
      if (!roleExists) {
        throw new NotFoundError('Role not found in organization', 'errors:notFound.role');
      }

      // 5. Get organization and inviter details for email
      const organization = (
        await this.services.organizations.getOrganizations(
          { ids: [organizationId], limit: 1, requestedFields: [] },
          tx
        )
      ).organizations[0];

      const inviter = (
        await this.services.users.getUsers({ ids: [invitedBy], limit: 1, requestedFields: [] }, tx)
      ).users[0];

      const roles = await this.services.roles.getRoles({ ids: [roleId], limit: 1 });
      const role = roles.roles[0];

      // 6. Create invitation
      const { token, validUntil } = generateSecureTokenMs(7 * 24 * 60 * 60 * 1000); // 7 days
      const expiresAt = new Date(validUntil);

      const invitation = await this.services.organizationInvitations.createInvitation(
        {
          organizationId,
          email,
          roleId,
          token,
          expiresAt,
          invitedBy,
          status: 'pending',
        },
        tx
      );

      // 7. Send invitation email (async, fire-and-forget)
      const localePrefix = locale || defaultLocale;
      const invitationUrl = `${config.security.frontendUrl}/${localePrefix}/invitations/${token}`;

      this.services.email
        .sendInvitation({
          to: email,
          organizationName: organization.name,
          inviterName: inviter.name,
          invitationUrl,
          roleName: role.name,
          locale,
        })
        .catch((error) => {
          this.logger.error({
            msg: 'Failed to send invitation email',
            err: error,
          });
          // Don't throw - invitation is already created
        });

      return invitation as OrganizationInvitation;
    });
  }

  /**
   * Accept an organization invitation
   */
  public async acceptInvitation(params: AcceptInvitationInput): Promise<AcceptInvitationResult> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { token, userData } = params;

      // 1. Get invitation
      const invitation = await this.services.organizationInvitations.getInvitationByToken(
        { token },
        tx
      );

      if (!invitation || invitation.status !== OrganizationInvitationStatus.Pending) {
        throw new BadRequestError('Invalid or expired invitation', 'errors:auth.invalidToken');
      }

      if (new Date() > invitation.expiresAt) {
        throw new BadRequestError('Invitation has expired', 'errors:auth.invalidToken');
      }

      // 2. Check if user authentication method exists
      let userAuthMethod =
        await this.services.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
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
        user = await this.services.users.createUser({ name: userData.name }, tx);

        // Create authentication method
        const { providerData } = await this.services.userAuthenticationMethods.processProvider(
          UserAuthenticationMethodProvider.Email,
          invitation.email,
          {
            password: userData.password,
            action: 'signup',
          }
        );

        userAuthMethod =
          await this.services.userAuthenticationMethods.createUserAuthenticationMethod(
            {
              userId: user.id,
              provider: UserAuthenticationMethodProvider.Email,
              providerId: invitation.email,
              providerData,
              isVerified: true, // Auto-verify invited users
            },
            tx
          );

        // Create account
        await this.services.accounts.createAccount(
          {
            name: userData.name,
            username: userData.username,
            type: AccountType.Organization,
            ownerId: user.id,
          },
          tx
        );
      } else {
        // Get existing user with accounts
        const usersResult = await this.services.users.getUsers(
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
            throw new BadRequestError(
              'User has reached maximum account limit',
              'errors:validation.maxAccountsReached'
            );
          }

          // Create Organization account for existing user
          // Fetch organization to get its name for username generation
          const organizationsResult = await this.services.organizations.getOrganizations(
            {
              ids: [invitation.organizationId],
              limit: 1,
            },
            tx
          );
          const organization = organizationsResult.organizations[0];

          // Generate username from user name using slugify
          let accountUsername = slugifySafe(user.name);

          // Ensure username is unique by checking availability through service
          // If not available, append organization name (slugified) to make it unique
          // Note: Database unique constraint will catch any race conditions
          let isAvailable = await this.services.accounts.checkUsernameAvailability(accountUsername);

          if (!isAvailable) {
            // Append organization slug to make username unique
            accountUsername = `${accountUsername}-${organization.slug}`;
            isAvailable = await this.services.accounts.checkUsernameAvailability(accountUsername);

            // If still not available, append user ID substring
            if (!isAvailable) {
              accountUsername = `${accountUsername}-${user.id.substring(0, 8)}`;
              isAvailable = await this.services.accounts.checkUsernameAvailability(accountUsername);
            }

            // If still not available, use timestamp
            if (!isAvailable) {
              accountUsername = `${accountUsername}-${Date.now().toString(36)}`;
            }
          }

          await this.services.accounts.createAccount(
            {
              name: user.name,
              username: accountUsername,
              type: AccountType.Organization,
              ownerId: user.id,
            },
            tx
          );
        }
      }

      // 5. Add user to organization
      await this.services.organizationUsers.addOrganizationUser(
        {
          organizationId: invitation.organizationId,
          userId: user!.id,
        },
        tx
      );

      // 6. Assign role
      await this.services.userRoles.addUserRole(
        {
          userId: user!.id,
          roleId: invitation.roleId,
        },
        tx
      );

      // 7. Update invitation status
      await this.services.organizationInvitations.updateInvitation(
        invitation.id,
        {
          status: 'accepted',
          acceptedAt: new Date(),
        },
        tx
      );

      // 8. Fetch all user accounts (after potential account creation)
      const updatedUsersResult = await this.services.users.getUsers(
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
    const invitation = await this.services.organizationInvitations.getInvitationByToken(params);
    return invitation as OrganizationInvitation | null;
  }

  /**
   * Get organization invitations
   */
  public async getOrganizationInvitations(
    params: QueryOrganizationInvitationsArgs
  ): Promise<OrganizationInvitationPage> {
    return await this.services.organizationInvitations.getInvitationsByOrganization(params);
  }

  /**
   * Revoke an invitation
   */
  public async revokeInvitation(id: string): Promise<OrganizationInvitation> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const invitation = await this.services.organizationInvitations.revokeInvitation(id, tx);
      return invitation as OrganizationInvitation;
    });
  }

  /**
   * Resend invitation email for a pending invitation
   */
  public async resendInvitationEmail(id: string, locale?: string): Promise<OrganizationInvitation> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      // 1. Get invitation by ID
      const invitation = await this.services.organizationInvitations.getInvitationById(id, tx);

      if (!invitation) {
        throw new NotFoundError('Invitation not found', 'errors:notFound.invitation');
      }

      // 2. Verify invitation is pending
      if (invitation.status !== OrganizationInvitationStatus.Pending) {
        throw new BadRequestError(
          'Can only resend email for pending invitations',
          'errors:validation.invalidStatus',
          { status: invitation.status }
        );
      }

      // 3. Verify invitation hasn't expired
      if (new Date() > invitation.expiresAt) {
        throw new BadRequestError('Invitation has expired', 'errors:auth.invalidToken');
      }

      // 4. Get organization and inviter details for email
      const organization = (
        await this.services.organizations.getOrganizations(
          { ids: [invitation.organizationId], limit: 1, requestedFields: [] },
          tx
        )
      ).organizations[0];

      const inviter = (
        await this.services.users.getUsers(
          { ids: [invitation.invitedBy], limit: 1, requestedFields: [] },
          tx
        )
      ).users[0];

      const roles = await this.services.roles.getRoles({ ids: [invitation.roleId], limit: 1 });
      const role = roles.roles[0];

      // 5. Resend invitation email (async, fire-and-forget)
      const localePrefix = locale || defaultLocale;
      const invitationUrl = `${config.security.frontendUrl}/${localePrefix}/invitations/${invitation.token}`;

      this.services.email
        .sendInvitation({
          to: invitation.email,
          organizationName: organization.name,
          inviterName: inviter.name,
          invitationUrl,
          roleName: role.name,
          locale,
        })
        .catch((error) => {
          this.logger.error({
            msg: 'Failed to resend invitation email',
            err: error,
          });
          // Don't throw - invitation still exists
        });

      return invitation as OrganizationInvitation;
    });
  }
}
