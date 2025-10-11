import {
  Organization,
  OrganizationSortableField,
  OrganizationSortInput,
  SortOrder,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

import {
  createOrganizationRequestSchema,
  deleteOrganizationQuerySchema,
  getOrganizationsQuerySchema,
  organizationParamsSchema,
  updateOrganizationRequestSchema,
} from '../schemas/organizations.schemas';

import { BaseController } from './base.controller';

import { parseRelations } from '@/lib/field-selection.lib';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

/**
 * Controller for organization-related REST endpoints
 */
export class OrganizationsController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  /**
   * GET /api/organizations
   * List organizations with optional filtering, pagination, and relations
   */
  async getOrganizations(
    req: TypedRequest<{ query: typeof getOrganizationsQuerySchema }>,
    res: Response
  ) {
    try {
      const { page, limit, search, ids, relations, sortField, sortOrder } = req.query;

      const requestedFields = parseRelations<Organization>(relations);

      const sort =
        sortField && sortOrder
          ? ({
              field: sortField as OrganizationSortableField,
              order: sortOrder as SortOrder,
            } as OrganizationSortInput)
          : undefined;

      const result = await this.context.handlers.organizations.getOrganizations({
        page,
        limit,
        search,
        ids,
        sort,
        requestedFields: requestedFields as any,
      });

      return this.success(res, {
        items: result.organizations,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    } catch (error) {
      return this.handleError(res, error, 'getOrganizations');
    }
  }

  /**
   * GET /api/organizations/:id
   * Get a single organization by ID with optional relations
   */
  async getOrganization(
    req: TypedRequest<{
      params: typeof organizationParamsSchema;
      query: typeof getOrganizationsQuerySchema;
    }>,
    res: Response
  ) {
    try {
      const { id } = req.params;
      const { relations } = req.query;

      const requestedFields = parseRelations<Organization>(relations);

      const result = await this.context.handlers.organizations.getOrganizations({
        ids: [id],
        limit: 1,
        requestedFields: requestedFields as any,
      });

      if (result.organizations.length === 0) {
        return res.status(404).json({
          error: 'Organization not found',
          code: 'NOT_FOUND',
        });
      }

      return this.success(res, result.organizations[0]);
    } catch (error) {
      return this.handleError(res, error, 'getOrganization');
    }
  }

  /**
   * POST /api/organizations
   * Create a new organization
   */
  async createOrganization(
    req: TypedRequest<{ body: typeof createOrganizationRequestSchema }>,
    res: Response
  ) {
    try {
      const { name } = req.body;

      const organization = await this.context.handlers.organizations.createOrganization({
        input: { name },
      });

      return this.created(res, organization);
    } catch (error) {
      return this.handleError(res, error, 'createOrganization');
    }
  }

  /**
   * PATCH /api/organizations/:id
   * Update an existing organization
   */
  async updateOrganization(
    req: TypedRequest<{
      body: typeof updateOrganizationRequestSchema;
      params: typeof organizationParamsSchema;
    }>,
    res: Response
  ) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const organization = await this.context.handlers.organizations.updateOrganization({
        id,
        input: { name },
      });

      return this.success(res, organization);
    } catch (error) {
      return this.handleError(res, error, 'updateOrganization');
    }
  }

  /**
   * DELETE /api/organizations/:id
   * Delete an organization (soft or hard delete)
   */
  async deleteOrganization(
    req: TypedRequest<{
      params: typeof organizationParamsSchema;
      query: typeof deleteOrganizationQuerySchema;
    }>,
    res: Response
  ) {
    try {
      const { id } = req.params;
      const { hardDelete } = req.query;

      const organization = await this.context.handlers.organizations.deleteOrganization({
        id,
        hardDelete: hardDelete || false,
      });

      return this.success(res, organization);
    } catch (error) {
      return this.handleError(res, error, 'deleteOrganization');
    }
  }
}
