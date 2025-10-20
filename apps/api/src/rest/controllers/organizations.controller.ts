import {
  Organization,
  OrganizationSortableField,
  OrganizationSortInput,
  SortOrder,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { parseRelations } from '@/lib/field-selection.lib';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

import {
  createOrganizationRequestSchema,
  deleteOrganizationQuerySchema,
  getOrganizationsQuerySchema,
  organizationParamsSchema,
  updateOrganizationRequestSchema,
} from '../schemas/organizations.schemas';

import { BaseController } from './base.controller';

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
      requestedFields,
    });

    return this.success(res, {
      items: result.organizations,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    });
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
    const { id } = req.params;
    const { relations } = req.query;

    const requestedFields = parseRelations<Organization>(relations);

    const result = await this.context.handlers.organizations.getOrganizations({
      ids: [id],
      limit: 1,
      requestedFields,
    });

    if (result.organizations.length === 0) {
      throw new NotFoundError('Organization not found', 'errors:notFound.organization');
    }

    return this.success(res, result.organizations[0]);
  }

  /**
   * POST /api/organizations
   * Create a new organization
   */
  async createOrganization(
    req: TypedRequest<{ body: typeof createOrganizationRequestSchema }>,
    res: Response
  ) {
    const { name } = req.body;
    const userId = this.context.user?.id;

    if (!userId) {
      throw new AuthenticationError('Authentication required', 'errors:auth.unauthorized');
    }

    const organization = await this.context.handlers.organizations.createOrganization(
      {
        input: { name },
      },
      userId
    );

    return this.success(res, organization, 201);
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
    const { id } = req.params;
    const { name } = req.body;

    const organization = await this.context.handlers.organizations.updateOrganization({
      id,
      input: { name },
    });

    return this.success(res, organization);
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
    const { id } = req.params;
    const { hardDelete } = req.query;

    const organization = await this.context.handlers.organizations.deleteOrganization({
      id,
      hardDelete: hardDelete || false,
    });

    return this.success(res, organization);
  }
}
