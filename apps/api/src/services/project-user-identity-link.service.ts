import type {
  IAuditLogger,
  ICredentialService,
  IEventPublisher,
  IProjectOAuthGrantService,
  IProjectUserIdentityLinkRepository,
  IProjectUserIdentityLinkService,
  IUserAuthenticationMethodRepository,
  IUserMfaService,
  ProjectUserIdentityLinkResult,
} from '@grantjs/core';
import { Tenant, UserAuthenticationMethodProvider } from '@grantjs/schema';

import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';

import { validateInput } from './common';
import { linkProjectUserIdentityParamsSchema } from './project-user-identity-link.schemas';

/** The refusal set-email gives for an address held by another account: no new disclosure. */
const HELD_ELSEWHERE = 'This authentication method is already connected to another account';

const LINK_IDENTITY_OPERATION = 'link-identity';

/**
 * `linkProjectUserIdentity`: an existing identity (the one that holds an address) takes over a
 * project member's membership of one project, and the member is retired.
 *
 * Preconditions, all read before any write: the project belongs to the organization; the
 * member is a member; a live user of the organization holds the address and is not a member;
 * the member cannot sign in (no authentication method, platform password or MFA factor), so
 * the link never removes a way someone signs in. Then, in the caller's transaction: the
 * project's rows move (`IProjectUserIdentityLinkRepository`), the member's project app grants
 * are revoked, the member's global import marker for the project is stripped (otherwise the
 * next import resolves the key to the member again and adds it back), and the member is
 * soft-deleted when no other project membership is left. One audit row on the membership, one
 * on a retired user, one `project.user_identity_linked` event. No `project.user_removed`,
 * `project.user_added` or `user.deleted`: a mirror reads those as an offboarding.
 */
export class ProjectUserIdentityLinkService implements IProjectUserIdentityLinkService {
  constructor(
    private readonly links: IProjectUserIdentityLinkRepository,
    private readonly authenticationMethods: IUserAuthenticationMethodRepository,
    private readonly credentials: ICredentialService,
    private readonly userMfa: IUserMfaService,
    private readonly projectOAuthGrants: IProjectOAuthGrantService,
    private readonly projectUserAudit: IAuditLogger,
    private readonly userAudit: IAuditLogger,
    private readonly events: IEventPublisher
  ) {}

  public async linkIdentity(
    params: { organizationId: string; projectId: string; userId: string; email: string },
    transaction?: Transaction
  ): Promise<ProjectUserIdentityLinkResult> {
    const context = 'ProjectUserIdentityLinkService.linkIdentity';
    const {
      organizationId,
      projectId,
      userId: fromUserId,
      email,
    } = validateInput(linkProjectUserIdentityParamsSchema, params, context);

    const holder = await this.authenticationMethods.findByProviderAndProviderId(
      UserAuthenticationMethodProvider.Email,
      email,
      undefined,
      transaction
    );

    const toUserId = holder?.userId ?? fromUserId;
    const facts = await this.links.readLinkFacts(
      { projectId, organizationId, fromUserId, toUserId },
      transaction
    );
    if (!facts.projectInOrganization) {
      throw new NotFoundError('Project');
    }
    if (!facts.fromIsMember) {
      throw new NotFoundError('User');
    }
    if (!holder) {
      throw new BadRequestError('No user holds this address: set the email instead');
    }
    if (holder.userId === fromUserId) {
      return {
        linked: false,
        projectUserId: null,
        fromUserId,
        toUserId: fromUserId,
        fromRetired: false,
        counts: null,
      };
    }
    if (!facts.toIsLive || !facts.toInOrganization) {
      throw new ConflictError(HELD_ELSEWHERE);
    }
    if (facts.toIsMember) {
      throw new ConflictError(
        'The user who holds this address is already a member of this project'
      );
    }
    await this.assertCannotSignIn(fromUserId, transaction);

    const { projectUserId, counts } = await this.links.moveProjectMembership(
      { projectId, fromUserId, toUserId },
      transaction
    );
    await this.projectOAuthGrants.revokeAllForUserInProject(projectId, fromUserId, transaction);
    await this.links.stripProjectImportMarker({ userId: fromUserId, projectId }, transaction);

    const fromRetired = !(await this.links.hasMembershipOutsideProject(
      { userId: fromUserId, projectId },
      transaction
    ));
    if (fromRetired) {
      await this.links.retireUser({ userId: fromUserId }, transaction);
      await this.userAudit.logSoftDelete(
        fromUserId,
        { userId: fromUserId },
        { userId: fromUserId, deleted: true },
        { operation: LINK_IDENTITY_OPERATION, projectId, linkedToUserId: toUserId },
        transaction
      );
    }

    await this.projectUserAudit.logUpdate(
      projectUserId,
      { projectId, userId: fromUserId },
      { projectId, userId: toUserId },
      { operation: LINK_IDENTITY_OPERATION, fromRetired, counts },
      transaction
    );

    await this.events.publish(
      {
        type: 'project.user_identity_linked',
        scope: { tenant: Tenant.OrganizationProject, id: `${organizationId}:${projectId}` },
        subjectUserId: toUserId,
        aggregate: { kind: 'projectUser', id: projectUserId },
        data: { after: { projectId, fromUserId, toUserId } },
      },
      transaction
    );

    return { linked: true, projectUserId, fromUserId, toUserId, fromRetired, counts };
  }

  /** The member must be an identity shell: nothing it holds lets anyone sign in as it. */
  private async assertCannotSignIn(userId: string, transaction?: Transaction): Promise<void> {
    const [methods, hasPassword, hasMfa] = await Promise.all([
      this.authenticationMethods.getUserAuthenticationMethods(
        { userId, requestedFields: ['id'] },
        transaction
      ),
      this.credentials.hasCredential({ scope: 'platform' }, userId),
      this.userMfa.hasActiveMfaEnrollment(userId, transaction),
    ]);
    if (methods.length > 0 || hasPassword || hasMfa) {
      throw new BadRequestError(
        'This project user can sign in, so it cannot be replaced: remove it instead'
      );
    }
  }
}
