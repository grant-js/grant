import {
  Account,
  AccountSortableField,
  AccountSortInput,
  SortOrder,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

import { accountParamsSchema, getAccountsQuerySchema } from '../schemas/accounts.schemas';

import { BaseController } from './base.controller';

import { parseRelations } from '@/lib/field-selection.lib';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

/**
 * Controller for account-related REST endpoints
 */
export class AccountsController extends BaseController {
  constructor(context: RequestContext) {
    super(context);
  }

  /**
   * GET /api/accounts
   * List accounts with optional filtering, pagination, and relations
   */
  async getAccounts(req: TypedRequest<{ query: typeof getAccountsQuerySchema }>, res: Response) {
    try {
      const { page, limit, search, ids, relations, sortField, sortOrder } = req.query;

      const requestedFields = parseRelations<Account>(relations);

      const sort =
        sortField && sortOrder
          ? ({
              field: sortField as AccountSortableField,
              order: sortOrder as SortOrder,
            } as AccountSortInput)
          : undefined;

      const result = await this.context.handlers.accounts.getAccounts({
        page,
        limit,
        search,
        ids,
        sort,
        requestedFields,
      });

      return this.success(res, {
        items: result.accounts,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    } catch (error) {
      return this.handleError(res, error, 'getAccounts');
    }
  }

  /**
   * GET /api/accounts/:id
   * Get a single account by ID
   */
  async getAccount(
    req: TypedRequest<{
      params: typeof accountParamsSchema;
      query: typeof getAccountsQuerySchema;
    }>,
    res: Response
  ) {
    try {
      const { id } = req.params;
      const { relations } = req.query;

      const requestedFields = parseRelations<Account>(relations);

      const result = await this.context.handlers.accounts.getAccounts({
        ids: [id],
        limit: 1,
        requestedFields,
      });

      if (result.accounts.length === 0) {
        return res.status(404).json({
          error: 'Account not found',
          code: 'NOT_FOUND',
        });
      }

      return this.success(res, result.accounts[0]);
    } catch (error) {
      return this.handleError(res, error, 'getAccount');
    }
  }
}
