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
  QueryOrganizationInvitationsArgs,
  UserAuthenticationMethodProvider,
} from '@logusgraphics/grant-schema';

import { config } from '@/config';
import { defaultLocale } from '@/i18n';
import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
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

      if (!invitation || invitation.status !== 'pending') {
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
      let account;
      let isNewUser = false;

      // 3. If user doesn't exist and userData not provided, require registration
      if (!userAuthMethod && !userData) {
        return {
          requiresRegistration: true,
          invitation: invitation as OrganizationInvitation,
          user: null,
          account: null,
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
        account = await this.services.accounts.createAccount(
          {
            name: userData.name,
            username: userData.username,
            type: AccountType.Organization,
            ownerId: user.id,
          },
          tx
        );
      } else {
        // Get existing user
        const usersResult = await this.services.users.getUsers(
          {
            ids: [userAuthMethod!.userId],
            limit: 1,
            requestedFields: ['accounts'],
          },
          tx
        );
        user = usersResult.users[0];
        account = user.accounts?.[0] || null;
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

      return {
        requiresRegistration: false,
        user: user!,
        account: (account as Account) || null,
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
}
