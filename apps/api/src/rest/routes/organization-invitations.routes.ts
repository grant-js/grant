import { Router } from 'express';

import { validate } from '@/middleware/validation.middleware';
import { OrganizationInvitationsController } from '@/rest/controllers/organization-invitations.controller';
import {
  acceptInvitationRequestSchema,
  getOrganizationInvitationsQuerySchema,
  invitationParamsSchema,
  invitationTokenParamsSchema,
  inviteMemberRequestSchema,
} from '@/rest/schemas/organization-invitations.schemas';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

export function createOrganizationInvitationsRoutes(context: RequestContext) {
  const router = Router();
  const controller = new OrganizationInvitationsController(context);

  /**
   * POST /api/organization-invitations/invite
   * Invite a member to an organization
   */
  router.post('/invite', validate({ body: inviteMemberRequestSchema }), (req, res) =>
    controller.inviteMember(req as TypedRequest<{ body: typeof inviteMemberRequestSchema }>, res)
  );

  /**
   * POST /api/organization-invitations/accept
   * Accept an organization invitation
   */
  router.post('/accept', validate({ body: acceptInvitationRequestSchema }), (req, res) =>
    controller.acceptInvitation(
      req as TypedRequest<{ body: typeof acceptInvitationRequestSchema }>,
      res
    )
  );

  /**
   * GET /api/organization-invitations/:token
   * Get invitation details by token (for public access)
   */
  router.get('/:token', validate({ params: invitationTokenParamsSchema }), (req, res) =>
    controller.getInvitationByToken(
      req as TypedRequest<{ params: typeof invitationTokenParamsSchema }>,
      res
    )
  );

  /**
   * GET /api/organization-invitations
   * List organization invitations
   */
  router.get('/', validate({ query: getOrganizationInvitationsQuerySchema }), (req, res) =>
    controller.getOrganizationInvitations(
      req as TypedRequest<{ query: typeof getOrganizationInvitationsQuerySchema }>,
      res
    )
  );

  /**
   * DELETE /api/organization-invitations/:id
   * Revoke an invitation
   */
  router.delete('/:id', validate({ params: invitationParamsSchema }), (req, res) =>
    controller.revokeInvitation(req as TypedRequest<{ params: typeof invitationParamsSchema }>, res)
  );

  return router;
}
