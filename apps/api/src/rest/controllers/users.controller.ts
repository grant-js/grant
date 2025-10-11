import { SortOrder, User, UserSortableField, UserSortInput } from '@logusgraphics/grant-schema';
import { Response } from 'express';

import {
  createUserRequestSchema,
  deleteUserQuerySchema,
  getUsersQuerySchema,
  updateUserRequestSchema,
  userParamsSchema,
} from '../schemas/users.schemas';

import { BaseController } from './base.controller';

import { parseRelations } from '@/lib/field-selection.lib';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

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
    try {
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
        requestedFields: requestedFields as any,
      });

      return this.success(res, {
        items: result.users,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    } catch (error) {
      return this.handleError(res, error, 'getUsers');
    }
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
    try {
      const { id } = req.params;
      const { relations, scopeId, tenant } = req.query;

      const requestedFields = parseRelations<User>(relations);

      const result = await this.context.handlers.users.getUsers({
        ids: [id],
        limit: 1,
        scope: { id: scopeId, tenant },
        requestedFields: requestedFields as any,
      });

      if (result.users.length === 0) {
        return res.status(404).json({
          error: 'User not found',
          code: 'NOT_FOUND',
        });
      }

      return this.success(res, result.users[0]);
    } catch (error) {
      return this.handleError(res, error, 'getUser');
    }
  }

  /**
   * POST /api/users
   * Create a new user
   */
  async createUser(req: TypedRequest<{ body: typeof createUserRequestSchema }>, res: Response) {
    try {
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

      return this.created(res, user);
    } catch (error) {
      return this.handleError(res, error, 'createUser');
    }
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
    try {
      const { id } = req.params;
      const { name, roleIds, tagIds, primaryTagId } = req.body;

      const user = await this.context.handlers.users.updateUser({
        id,
        input: { name, roleIds, tagIds, primaryTagId },
      });

      return this.success(res, user);
    } catch (error) {
      return this.handleError(res, error, 'updateUser');
    }
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
    try {
      const { id } = req.params;
      const { scopeId, tenant, hardDelete } = req.query;

      const user = await this.context.handlers.users.deleteUser({
        id,
        scope: { id: scopeId, tenant },
        hardDelete: hardDelete || false,
      });

      return this.success(res, user);
    } catch (error) {
      return this.handleError(res, error, 'deleteUser');
    }
  }
}
