import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Scope, SortOrder, Tenant } from '@grantjs/schema';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

import { authorizeRestRoute, requireEmailThenMfaRest } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import { queryListCommons, SortInput } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';

/**
 * Router factory for the scoped, tag-filterable CRUD resources.
 *
 * `groups`, `roles` and `permissions` had four identical route definitions
 * each. Normalized for the entity name, roles and permissions were byte-for-byte
 * identical and groups differed only in import ordering.
 *
 * Deliberately not used by `tags` or `resources`. Both are ~20% different in
 * ways that are behavioural, not cosmetic: tags deletes via a body schema
 * rather than a query schema and exposes no `requestedFields`; resources adds
 * an `isActive` filter, hardcodes `requestedFields` to `[]`, and passes
 * `context.locale` into create. Folding either in would mean options that only
 * one caller sets, which is how a factory becomes harder to read than the code
 * it replaced.
 *
 * The middleware order is load-bearing and matches the hand-written routers
 * exactly: `validate` -> `requireEmailThenMfaRest` -> `authorizeRestRoute` ->
 * handler. Authorization runs after MFA so a step-up challenge is raised before
 * a permission denial, and validation runs first so neither sees unparsed input.
 * GET is intentionally the one route without the MFA guard.
 */
interface CrudRouterSchemas {
  /** Query schema for the list route. */
  list: z.ZodTypeAny;
  /** Body schema for create. */
  create: z.ZodTypeAny;
  /** Body schema for update. */
  update: z.ZodTypeAny;
  /** Path-params schema shared by update and delete. */
  params: z.ZodTypeAny;
  /** Query schema carrying `scopeId`/`tenant`, used by update and delete. */
  scopeQuery: z.ZodTypeAny;
}

export interface CrudListArgs<TEntity, TSortInput> {
  page?: number;
  limit?: number;
  search?: string;
  sort?: TSortInput;
  tagIds?: string[];
  scope: Scope;
  requestedFields?: Array<keyof TEntity>;
}

/**
 * The query shape every `schemas.list` must produce. Stated here because the
 * factory holds the schemas as `ZodTypeAny` — it cannot infer their parsed type
 * the way a hand-written router could — so this interface is the contract each
 * caller's list schema has to satisfy. `validate()` has already parsed and
 * rejected anything else by the time the handler runs, which is what makes the
 * one cast below sound.
 */
interface CrudListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: SortOrder;
  tagIds?: string[];
  scopeId?: string;
  tenant?: Tenant;
  relations?: string[] | string | null;
  fields?: string[] | string | null;
}

/** Params and scope query shared by the update and delete routes. */
interface CrudMutationRequest {
  params: { id: string };
  query: { scopeId: string; tenant: Tenant };
}

/**
 * Every type parameter is inferred from the callbacks, so callers annotate the
 * lambda parameters rather than passing explicit type arguments. That keeps the
 * handler calls fully checked against their concrete input types — the factory
 * itself only ever sees `req.body`, which `validate()` has already parsed.
 */
export interface CrudRouterOptions<
  TEntity extends object,
  TSortInput extends SortInput,
  TCreateInput,
  TUpdateInput,
> {
  resource: ResourceSlug;
  schemas: CrudRouterSchemas;
  list(args: CrudListArgs<TEntity, TSortInput>): Promise<object>;
  create(input: TCreateInput): Promise<TEntity>;
  update(id: string, input: TUpdateInput): Promise<TEntity>;
  remove(id: string, scope: Scope): Promise<TEntity>;
}

export function createCrudRouter<
  TEntity extends object,
  TSortInput extends SortInput,
  TCreateInput,
  TUpdateInput,
>(options: CrudRouterOptions<TEntity, TSortInput, TCreateInput, TUpdateInput>): Router {
  const { resource, schemas } = options;
  const router = Router();

  // Personal-context allowances mirror the hand-written routers: these resources
  // are reachable from a personal account, so an org-level MFA requirement must
  // not block them.
  const mfaGuard = () =>
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true });

  router.get(
    '/',
    validate({ query: schemas.list }),
    authorizeRestRoute({ resource, action: ResourceAction.Query }),
    async (req: Request, res: Response) => {
      // Safe by construction: validate({ query: schemas.list }) ran first.
      const {
        page,
        limit,
        search,
        sortField,
        sortOrder,
        tagIds,
        scopeId,
        tenant,
        relations,
        fields,
      } = req.query as unknown as CrudListQuery;

      const { requestedFields, sort, scope } = queryListCommons<TEntity, TSortInput>({
        fields,
        relations,
        sortField,
        sortOrder,
        scopeId,
        tenant,
      });

      const result = await options.list({
        page,
        limit,
        search,
        sort,
        tagIds,
        scope: scope!,
        requestedFields,
      });

      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/',
    validate({ body: schemas.create }),
    mfaGuard(),
    authorizeRestRoute({ resource, action: ResourceAction.Create }),
    async (req, res) => {
      const entity = await options.create(req.body as TCreateInput);
      sendSuccessResponse(res, entity, 201);
    }
  );

  router.patch(
    '/:id',
    validate({ params: schemas.params, body: schemas.update, query: schemas.scopeQuery }),
    mfaGuard(),
    authorizeRestRoute({ resource, action: ResourceAction.Update }),
    async (req: Request, res: Response) => {
      const { params, query } = req as unknown as CrudMutationRequest;

      const entity = await options.update(params.id, {
        ...req.body,
        scope: { id: query.scopeId, tenant: query.tenant },
      } as TUpdateInput);

      sendSuccessResponse(res, entity);
    }
  );

  router.delete(
    '/:id',
    validate({ params: schemas.params, query: schemas.scopeQuery }),
    mfaGuard(),
    authorizeRestRoute({ resource, action: ResourceAction.Delete }),
    async (req: Request, res: Response) => {
      const { params, query } = req as unknown as CrudMutationRequest;

      const entity = await options.remove(params.id, { id: query.scopeId, tenant: query.tenant });

      sendSuccessResponse(res, entity);
    }
  );

  return router;
}
