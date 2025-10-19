import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';
import { Response } from 'express';

import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

import {
  acceptInvitationRequestSchema,
  getOrganizationInvitationsQuerySchema,
  invitationParamsSchema,
  invitationTokenParamsSchema,
  inviteMemberRequestSchema,
} from '../schemas/organization-invitations.schemas';

import { BaseController } from './base.controller';

/**
 * Controller for organization invitation-related REST endpoints
 */
export class OrganizationInvitationsController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  /**
   * POST /api/organization-invitations/invite
   * Invite a member to an organization
   */
  async inviteMember(req: TypedRequest<{ body: typeof inviteMemberRequestSchema }>, res: Response) {
    try {
      const { organizationId, email, roleId } = req.body;
      const invitedBy = this.context.user?.id;

      if (!invitedBy) {
        return this.handleError(res, new Error('Authentication required'), 'inviteMember', 401);
      }

      const invitation = await this.context.handlers.organizationInvitations.inviteMember(
        { organizationId, email, roleId },
        invitedBy
      );

      return this.success(res, invitation, 201);
    } catch (error) {
      return this.handleError(res, error, 'inviteMember');
    }
  }

  /**
   * POST /api/organization-invitations/accept
   * Accept an organization invitation
   */
  async acceptInvitation(
    req: TypedRequest<{ body: typeof acceptInvitationRequestSchema }>,
    res: Response
  ) {
    try {
      const { token, userData } = req.body;

      const result = await this.context.handlers.organizationInvitations.acceptInvitation({
        token,
        userData,
      });

      return this.success(res, result);
    } catch (error) {
      return this.handleError(res, error, 'acceptInvitation');
    }
  }

  /**
   * GET /api/organization-invitations/:token
   * Get invitation details by token (for public access)
   */
  async getInvitationByToken(
    req: TypedRequest<{ params: typeof invitationTokenParamsSchema }>,
    res: Response
  ) {
    try {
      const { token } = req.params;

      const invitation = await this.context.handlers.organizationInvitations.getInvitation(token);

      if (!invitation) {
        return this.handleError(
          res,
          new Error('Invitation not found or has expired'),
          'getInvitationByToken',
          404
        );
      }

      return this.success(res, invitation);
    } catch (error) {
      return this.handleError(res, error, 'getInvitationByToken');
    }
  }

  /**
   * GET /api/organization-invitations
   * List organization invitations with optional status filtering
   */
  async getOrganizationInvitations(
    req: TypedRequest<{ query: typeof getOrganizationInvitationsQuerySchema }>,
    res: Response
  ) {
    try {
      const { organizationId, status } = req.query;

      const result = await this.context.handlers.organizationInvitations.getOrganizationInvitations(
        organizationId,
        status as OrganizationInvitationStatus | undefined
      );

      return this.success(res, {
        items: result.invitations,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    } catch (error) {
      return this.handleError(res, error, 'getOrganizationInvitations');
    }
  }

  /**
   * DELETE /api/organization-invitations/:id
   * Revoke an invitation
   */
  async revokeInvitation(
    req: TypedRequest<{ params: typeof invitationParamsSchema }>,
    res: Response
  ) {
    try {
      const { id } = req.params;

      const invitation = await this.context.handlers.organizationInvitations.revokeInvitation(id);

      return this.success(res, invitation);
    } catch (error) {
      return this.handleError(res, error, 'revokeInvitation');
    }
  }
}
