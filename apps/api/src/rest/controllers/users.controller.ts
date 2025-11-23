import {
  SortOrder,
  User,
  UserAuthenticationMethodProvider,
  UserSortableField,
  UserSortInput,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

import { config } from '@/config';
import { AuthorizationError, BadRequestError, NotFoundError } from '@/lib/errors';
import { parseRelations } from '@/lib/field-selection.lib';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

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
} from '../schemas/users.schemas';

import { BaseController } from './base.controller';

/**
 * Controller for user-related REST endpoints
 */
export class UsersController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  /**
   * GET /api/users
   * List users with optional filtering, pagination, and relations
   */
  async getUsers(req: TypedRequest<{ query: typeof getUsersQuerySchema }>, res: Response) {
    const { page, limit, search, ids, relations, sortField, sortOrder, tagIds, scopeId, tenant } =
      req.query;

    const requestedFields = parseRelations<User>(relations);

    const sort =
      sortField && sortOrder
        ? ({
            field: sortField as UserSortableField,
            order: sortOrder as SortOrder,
          } as UserSortInput)
        : undefined;

    const result = await this.context.handlers.users.getUsers({
      page,
      limit,
      search,
      ids,
      sort,
      tagIds,
      scope: { id: scopeId, tenant },
      requestedFields,
    });

    return this.success(res, {
      items: result.users,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    });
  }

  /**
   * GET /api/users/:id
   * Get a single user by ID with optional relations
   */
  async getUser(
    req: TypedRequest<{
      params: typeof userParamsSchema;
      query: typeof getUsersQuerySchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;
    const { relations, scopeId, tenant } = req.query;

    const requestedFields = parseRelations<User>(relations);

    const result = await this.context.handlers.users.getUsers({
      ids: [id],
      limit: 1,
      scope: { id: scopeId, tenant },
      requestedFields,
    });

    if (result.users.length === 0) {
      throw new NotFoundError('User not found', 'errors:notFound.user');
    }

    return this.success(res, result.users[0]);
  }

  /**
   * POST /api/users
   * Create a new user
   */
  async createUser(req: TypedRequest<{ body: typeof createUserRequestSchema }>, res: Response) {
    const { name, scope, roleIds, tagIds, primaryTagId } = req.body;

    const user = await this.context.handlers.users.createUser({
      input: {
        name,
        scope,
        roleIds,
        tagIds,
        primaryTagId,
      },
    });

    return this.success(res, user, 201);
  }

  /**
   * PATCH /api/users/:id
   * Update an existing user
   */
  async updateUser(
    req: TypedRequest<{
      body: typeof updateUserRequestSchema;
      params: typeof userParamsSchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;
    const { name, roleIds, tagIds, primaryTagId } = req.body;

    const user = await this.context.handlers.users.updateUser({
      id,
      input: { name, roleIds, tagIds, primaryTagId },
    });

    return this.success(res, user);
  }

  /**
   * DELETE /api/users/:id
   * Delete a user (soft or hard delete)
   */
  async deleteUser(
    req: TypedRequest<{
      params: typeof userParamsSchema;
      query: typeof deleteUserQuerySchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;
    const { scopeId, tenant, hardDelete } = req.query;

    const user = await this.context.handlers.users.deleteUser({
      id,
      scope: { id: scopeId, tenant },
      hardDelete: hardDelete || false,
    });

    return this.success(res, user);
  }

  /**
   * POST /api/users/:id/picture
   * Upload a user profile picture
   */
  async uploadPicture(
    req: TypedRequest<{
      params: typeof userParamsSchema;
      body: typeof uploadUserPictureRequestSchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;
    const { file, filename, contentType } = req.body;

    if (!this.user || this.user.id !== id) {
      throw new NotFoundError(
        'You can only upload pictures for your own account',
        'errors:auth.unauthorized'
      );
    }

    if (
      !config.storage.upload.allowedTypes.includes(
        contentType as (typeof config.storage.upload.allowedTypes)[number]
      )
    ) {
      throw new BadRequestError(
        `Invalid file type. Allowed types: ${config.storage.upload.allowedTypes.join(', ')}`,
        'errors:validation.invalid',
        { field: 'contentType' }
      );
    }

    const fileExtension = filename.split('.').pop()?.toLowerCase();
    if (
      !fileExtension ||
      !config.storage.upload.allowedExtensions.includes(
        fileExtension as (typeof config.storage.upload.allowedExtensions)[number]
      )
    ) {
      throw new BadRequestError(
        `Invalid file extension. Allowed extensions: ${config.storage.upload.allowedExtensions.join(', ')}`,
        'errors:validation.invalid',
        { field: 'filename' }
      );
    }

    let fileBuffer: Buffer;
    try {
      const base64Data = file.replace(/^data:.*,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    } catch {
      throw new BadRequestError('Invalid base64 file data', 'errors:validation.invalid', {
        field: 'file',
      });
    }

    if (fileBuffer.length > config.storage.upload.maxFileSize) {
      throw new BadRequestError(
        `File size exceeds maximum of ${config.storage.upload.maxFileSize / 1024 / 1024}MB`,
        'errors:validation.invalid',
        { field: 'file' }
      );
    }

    const result = await this.context.handlers.users.uploadUserPicture({
      userId: id,
      file: fileBuffer,
      contentType,
      filename,
    });

    return this.success(res, result, 201);
  }

  /**
   * GET /api/users/:id/authentication-methods
   * Get user authentication methods
   */
  async getAuthenticationMethods(
    req: TypedRequest<{
      params: typeof userParamsSchema;
      query: typeof getUserAuthenticationMethodsQuerySchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;
    const { provider } = req.query;

    if (!this.user || this.user.id !== id) {
      throw new NotFoundError(
        'You can only query your own authentication methods',
        'errors:auth.unauthorized'
      );
    }

    const methods = await this.handlers.users.getUserAuthenticationMethods({
      userId: id,
      provider: provider as UserAuthenticationMethodProvider | undefined,
    });

    return this.success(res, methods);
  }

  /**
   * POST /api/users/:id/change-password
   * Change user password
   */
  async changePassword(
    req: TypedRequest<{
      params: typeof userParamsSchema;
      body: typeof changePasswordRequestSchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!this.user || this.user.id !== id) {
      throw new NotFoundError('You can only change your own password', 'errors:auth.unauthorized');
    }

    await this.context.handlers.users.changePassword(id, currentPassword, newPassword);

    return this.success(res, {
      success: true,
      message: 'Password changed successfully',
    });
  }

  /**
   * GET /api/users/:id/sessions
   * Get user sessions
   */
  async getSessions(
    req: TypedRequest<{
      params: typeof userParamsSchema;
      query: typeof getUserSessionsQuerySchema;
    }>,
    res: Response
  ) {
    const { id } = req.params;
    const { page, limit, audience } = req.query;

    if (!this.user || this.user.id !== id) {
      throw new NotFoundError('You can only query your own sessions', 'errors:auth.unauthorized');
    }

    const result = await this.handlers.users.getUserSessions({
      userId: id,
      audience,
      page,
      limit,
    });

    return this.success(res, result);
  }

  /**
   * DELETE /api/users/:id/sessions/:sessionId
   * Revoke a user session
   */
  async revokeSession(
    req: TypedRequest<{
      params: typeof userParamsSchema & { sessionId: string };
    }>,
    res: Response
  ) {
    const { id, sessionId } = req.params;

    if (!this.user || this.user.id !== id) {
      throw new NotFoundError('You can only revoke your own sessions', 'errors:auth.unauthorized');
    }

    const sessions = await this.handlers.users.getUserSessions({
      userId: id,
      limit: 1,
    });

    const session = sessions.userSessions.find((s) => s.id === sessionId);

    if (!session) {
      throw new NotFoundError('Session not found', 'errors:common.notFound');
    }

    if (session.userId !== id) {
      throw new NotFoundError('You can only revoke your own sessions', 'errors:auth.unauthorized');
    }

    await this.handlers.users.revokeUserSession(sessionId);

    return this.success(res, {
      success: true,
      message: 'Session revoked successfully',
    });
  }

  /**
   * GET /api/users/:id/export
   * Export user data (GDPR compliance)
   */
  async exportUserData(
    req: TypedRequest<{
      params: typeof userParamsSchema;
    }>,
    res: Response
  ) {
    const userId = req.params.id;

    // Verify user can only export their own data
    if (!this.user || this.user.id !== userId) {
      throw new NotFoundError('You can only export your own data', 'errors:auth.unauthorized');
    }

    const exportData = await this.handlers.users.exportUserData(userId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="user-data-${userId}-${Date.now()}.json"`
    );
    res.json(exportData);
  }

  /**
   * DELETE /api/users/:id/account
   * Delete user account from privacy settings (marks all accounts and user for deletion)
   * Uses accounts handler to delete all user's accounts and the user itself
   */
  async deleteUserAccount(
    req: TypedRequest<{
      params: typeof userParamsSchema;
      body: typeof deleteUserAccountRequestSchema;
    }>,
    res: Response
  ) {
    const userId = req.params.id;
    const { userId: bodyUserId, hardDelete } = req.body;

    // Verify user can only delete their own account
    if (!this.user || this.user.id !== userId) {
      throw new AuthorizationError('You can only delete your own account', 'errors:auth.forbidden');
    }

    // Verify userId from body matches authenticated user
    if (bodyUserId !== userId) {
      throw new AuthorizationError('User ID must match your user ID', 'errors:auth.forbidden');
    }

    // Use accounts handler to delete (which handles all accounts and user)
    const deletedUser = await this.context.handlers.accounts.deleteAccount({
      input: {
        userId,
        hardDelete,
      },
    });

    return this.success(res, deletedUser);
  }
}
