import { Router } from 'express';
import { z } from 'zod';

import { validate } from '@/middleware/validation.middleware';
import { UsersController } from '@/rest/controllers/users.controller';
import {
  changePasswordRequestSchema,
  createUserRequestSchema,
  deleteUserAccountRequestSchema,
  deleteUserQuerySchema,
  getUserAuthenticationMethodsQuerySchema,
  getUserSessionsQuerySchema,
  getUsersQuerySchema,
  updateUserRequestSchema,
  uploadUserPictureRequestSchema,
  userParamsSchema,
} from '@/rest/schemas/users.schemas';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

export function createUserRoutes(context: RequestContext) {
  const router = Router();
  const usersController = new UsersController(context);

  /**
   * GET /api/users
   * List users with optional filtering and relations
   */
  router.get('/', validate({ query: getUsersQuerySchema }), (req, res) =>
    usersController.getUsers(req as TypedRequest<{ query: typeof getUsersQuerySchema }>, res)
  );

  /**
   * GET /api/users/:id/export
   * Export user data (GDPR compliance)
   * NOTE: This route must come before /:id to avoid route matching conflicts
   */
  router.get('/:id/export', validate({ params: userParamsSchema }), async (req, res) => {
    await usersController.exportUserData(
      req as TypedRequest<{
        params: typeof userParamsSchema;
      }>,
      res
    );
  });

  /**
   * GET /api/users/:id
   * Get a single user by ID with optional relations
   */
  router.get(
    '/:id',
    validate({ params: userParamsSchema, query: getUsersQuerySchema }),
    (req, res) =>
      usersController.getUser(
        req as TypedRequest<{
          params: typeof userParamsSchema;
          query: typeof getUsersQuerySchema;
        }>,
        res
      )
  );

  /**
   * POST /api/users
   * Create a new user
   */
  router.post('/', validate({ body: createUserRequestSchema }), (req, res) =>
    usersController.createUser(req as TypedRequest<{ body: typeof createUserRequestSchema }>, res)
  );

  /**
   * PATCH /api/users/:id
   * Update an existing user
   */
  router.patch(
    '/:id',
    validate({ params: userParamsSchema, body: updateUserRequestSchema }),
    (req, res) =>
      usersController.updateUser(
        req as TypedRequest<{
          body: typeof updateUserRequestSchema;
          params: typeof userParamsSchema;
        }>,
        res
      )
  );

  /**
   * DELETE /api/users/:id
   * Delete a user
   */
  router.delete(
    '/:id',
    validate({ params: userParamsSchema, query: deleteUserQuerySchema }),
    (req, res) =>
      usersController.deleteUser(
        req as TypedRequest<{
          params: typeof userParamsSchema;
          query: typeof deleteUserQuerySchema;
        }>,
        res
      )
  );

  /**
   * POST /api/users/:id/picture
   * Upload a user profile picture
   */
  router.post(
    '/:id/picture',
    validate({ params: userParamsSchema, body: uploadUserPictureRequestSchema }),
    (req, res) =>
      usersController.uploadPicture(
        req as TypedRequest<{
          params: typeof userParamsSchema;
          body: typeof uploadUserPictureRequestSchema;
        }>,
        res
      )
  );

  /**
   * GET /api/users/:id/authentication-methods
   * Get user authentication methods
   */
  router.get(
    '/:id/authentication-methods',
    validate({ params: userParamsSchema, query: getUserAuthenticationMethodsQuerySchema }),
    (req, res) =>
      usersController.getAuthenticationMethods(
        req as TypedRequest<{
          params: typeof userParamsSchema;
          query: typeof getUserAuthenticationMethodsQuerySchema;
        }>,
        res
      )
  );

  /**
   * POST /api/users/:id/change-password
   * Change user password
   */
  router.post(
    '/:id/change-password',
    validate({ params: userParamsSchema, body: changePasswordRequestSchema }),
    (req, res) =>
      usersController.changePassword(
        req as TypedRequest<{
          params: typeof userParamsSchema;
          body: typeof changePasswordRequestSchema;
        }>,
        res
      )
  );

  /**
   * GET /api/users/:id/sessions
   * Get user sessions
   */
  router.get(
    '/:id/sessions',
    validate({ params: userParamsSchema, query: getUserSessionsQuerySchema }),
    (req, res) =>
      usersController.getSessions(
        req as TypedRequest<{
          params: typeof userParamsSchema;
          query: typeof getUserSessionsQuerySchema;
        }>,
        res
      )
  );

  /**
   * DELETE /api/users/:id/sessions/:sessionId
   * Revoke a user session
   */
  router.delete(
    '/:id/sessions/:sessionId',
    validate({
      params: userParamsSchema.merge(
        z.object({
          sessionId: z.uuid('Invalid session ID'),
        })
      ),
    }),
    (req, res) =>
      usersController.revokeSession(
        req as TypedRequest<{
          params: typeof userParamsSchema & { sessionId: string };
        }>,
        res
      )
  );

  /**
   * DELETE /api/users/:id/account
   * Delete user account from privacy settings (marks all accounts and user for deletion)
   * NOTE: This route must come before /:id to avoid route matching conflicts
   */
  router.delete(
    '/:id/account',
    validate({ params: userParamsSchema, body: deleteUserAccountRequestSchema }),
    (req, res) =>
      usersController.deleteUserAccount(
        req as TypedRequest<{
          params: typeof userParamsSchema;
          body: typeof deleteUserAccountRequestSchema;
        }>,
        res
      )
  );

  return router;
}
