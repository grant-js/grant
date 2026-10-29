/**
 * A scoped operation must not act in a scope other than the one the request was authorized in.
 * `authorizeGraphQLResolver` and `authorizeRestRoute` enforce that, but only for operations that
 * are mounted behind them. These tests walk what the API actually serves (the executable GraphQL
 * schema with its registered resolvers, and the built REST router) and fail when an operation that
 * names a scope is not behind its transport's guard. A new scoped operation that forgets the guard
 * fails here.
 *
 * The one place an operation can opt out is `UNGUARDED_SCOPED_OPERATIONS`.
 */
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Route stack entries do not say which schema they validate with, so the real `validate` is
// wrapped to tag the middleware it returns with its schemas. `validateBody` and `validateQuery`
// call the module-internal `validate`, so they are re-expressed through the tagging one.
vi.mock('@/middleware/validation.middleware', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/middleware/validation.middleware')>();
  const validate = (schemas: Parameters<typeof original.validate>[0]) =>
    Object.assign(original.validate(schemas), { validationSchemas: schemas });
  return {
    ...original,
    validate,
    validateBody: (schema: z.ZodSchema) => validate({ body: schema }),
    validateQuery: (schema: z.ZodSchema) => validate({ query: schema }),
  };
});

const { schema } = await import('@/graphql/resolvers');
const { Mutation } = await import('@/graphql/resolvers/mutations');
const { Query } = await import('@/graphql/resolvers/queries');
const { isAuthorizedGraphQLResolver } = await import('@/lib/authorization/graphql-guard');
const { AUTHORIZED_REST_ROUTE } = await import('@/lib/authorization/rest-guard');
const { createRestRouter } = await import('@/rest');
const { getOpenApiDocument } = await import('@/rest/openapi');

/**
 * Operations that name a scope without an authorized one. Each entry says why the guard cannot
 * apply. Nothing is listed to make a test pass: an entry that is guarded after all, or that no
 * longer exists, fails below, so this list cannot rot.
 *
 * GraphQL needs no entry: every `Query` and `Mutation` field that names a scope is guarded.
 */
export const UNGUARDED_SCOPED_OPERATIONS: ReadonlyArray<{ operation: string; reason: string }> = [
  {
    operation: 'POST /api/auth/token',
    reason:
      'Client-credentials exchange: the caller has no session or token yet, and the scope in the body is the one the credentials are exchanged for.',
  },
  {
    operation: 'POST /api/auth/is-authorized',
    reason:
      'Asks whether the signed-in caller holds a permission in the named scope; it reads and changes nothing in that scope, and naming another scope is its purpose.',
  },
];

const allowlisted = (operation: string) =>
  UNGUARDED_SCOPED_OPERATIONS.some((entry) => entry.operation === operation);

// --- GraphQL ---------------------------------------------------------------------------------

/**
 * `graphql` objects built by `@graphql-tools/schema` can come from a different module instance
 * than this file's `graphql` import, which makes `instanceof`-based helpers throw; the string tag
 * is the same in every copy.
 */
const graphqlKind = (type: unknown): string => Object.prototype.toString.call(type).slice(8, -1);

type GraphqlType = {
  ofType?: GraphqlType;
  getFields?: () => Record<string, { type: GraphqlType }>;
};

const namedType = (type: GraphqlType): GraphqlType => (type.ofType ? namedType(type.ofType) : type);

/** The argument paths at which a field takes a `scope`: `scope`, `input.scope`, … */
function scopePaths(
  type: GraphqlType,
  path: string,
  seen: ReadonlySet<GraphqlType> = new Set()
): string[] {
  const named = namedType(type);
  if (graphqlKind(named) !== 'GraphQLInputObjectType' || seen.has(named) || !named.getFields) {
    return [];
  }
  const visited = new Set(seen).add(named);
  return Object.entries(named.getFields()).flatMap(([name, field]) => [
    ...(name === 'scope' ? [`${path}.scope`] : []),
    ...scopePaths(field.type, `${path}.${name}`, visited),
  ]);
}

interface ScopedField {
  operation: string;
  guarded: boolean;
  paths: string[];
}

function scopedRootFields(): ScopedField[] {
  // The fields come from the executable schema; the resolvers from the maps the API hands it. The
  // schema's own `field.resolve` is a wrapper graphql-tools adds, so it cannot carry the mark.
  const roots = [
    ['Query', schema.getQueryType(), Query],
    ['Mutation', schema.getMutationType(), Mutation],
  ] as const;

  return roots.flatMap(([rootName, root, resolvers]) =>
    Object.entries(root?.getFields() ?? {}).flatMap(([fieldName, field]) => {
      const paths = field.args.flatMap((arg) => [
        ...(arg.name === 'scope' ? ['scope'] : []),
        ...scopePaths(arg.type as unknown as GraphqlType, arg.name),
      ]);
      return paths.length === 0
        ? []
        : [
            {
              operation: `${rootName}.${fieldName}`,
              guarded: isAuthorizedGraphQLResolver(
                (resolvers as Record<string, unknown>)[fieldName]
              ),
              paths,
            },
          ];
    })
  );
}

describe('every GraphQL operation that names a scope is authorized', () => {
  const scoped = scopedRootFields();

  it('finds the scoped operations (the walk itself is not broken)', () => {
    expect(scoped.length).toBeGreaterThanOrEqual(80);
    const names = scoped.map((field) => field.operation);
    expect(names).toEqual(
      expect.arrayContaining([
        'Mutation.setProjectUserEmail',
        'Mutation.setProjectUserPassword',
        'Query.exportProjectUserCredentials',
        'Mutation.createUser',
        'Query.users',
      ])
    );
  });

  it('wraps every one of them in authorizeGraphQLResolver', () => {
    const unguarded = scoped
      .filter((field) => !field.guarded && !allowlisted(field.operation))
      .map((field) => field.operation);
    expect(unguarded).toEqual([]);
  });

  it('only takes the scope where the guard reads it (args.scope, args.input.scope)', () => {
    const elsewhere = scoped
      .filter((field) => field.paths.some((path) => path !== 'scope' && path !== 'input.scope'))
      .map((field) => `${field.operation}: ${field.paths.join(', ')}`);
    expect(elsewhere).toEqual([]);
  });

  it('lists no GraphQL operation that is guarded or does not exist', () => {
    const entries = UNGUARDED_SCOPED_OPERATIONS.filter((entry) =>
      /^(Query|Mutation)\./.test(entry.operation)
    );
    for (const entry of entries) {
      const field = scoped.find((candidate) => candidate.operation === entry.operation);
      expect(field, `${entry.operation} names a scope`).toBeDefined();
      expect(field?.guarded, `${entry.operation} is not guarded`).toBe(false);
    }
  });
});

// --- REST ------------------------------------------------------------------------------------

interface RouteLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: Record<PropertyKey, unknown> }>;
  };
  handle?: { stack?: RouteLayer[] };
  matchers?: Array<(path: string) => { path: string } | false>;
}

interface ValidationSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
}

/** How a request schema carries a scope: an object `scope`, an object `input.scope`, or `scopeId` + `tenant`. */
function scopeForms(schemas: ValidationSchemas | undefined): string[] {
  const forms: string[] = [];
  for (const [part, zodSchema] of Object.entries(schemas ?? {})) {
    if (!zodSchema) continue;
    const json = z.toJSONSchema(zodSchema as z.ZodType, {
      io: 'input',
      unrepresentable: 'any',
    }) as {
      properties?: Record<
        string,
        { type?: string; properties?: Record<string, { type?: string }> }
      >;
    };
    const properties = json.properties ?? {};
    if (properties.scope?.type === 'object') forms.push(`${part}.scope`);
    if (properties.input?.properties?.scope?.type === 'object') forms.push(`${part}.input.scope`);
    if (properties.scopeId && properties.tenant) forms.push(`${part}.scopeId+tenant`);
  }
  return forms;
}

interface ScopedRoute {
  operation: string;
  guarded: boolean;
  forms: string[];
}

function scopedRoutes(): ScopedRoute[] {
  const document = getOpenApiDocument();
  const segments = [
    ...new Set(Object.keys(document.paths ?? {}).map((path) => path.split('/')[2] ?? '')),
  ].filter(Boolean);

  const top = createRestRouter().stack as unknown as RouteLayer[];
  const routes: ScopedRoute[] = [];

  for (const mount of top) {
    const sub = mount.handle?.stack;
    if (mount.route || !sub) continue;

    const prefix = segments.find((segment) => mount.matchers?.[0]?.(`/${segment}/x`)) ?? '?';

    for (const layer of sub) {
      if (!layer.route) continue;
      const handlers = layer.route.stack.map((entry) => entry.handle);
      const forms = handlers.flatMap((handler) =>
        scopeForms(handler.validationSchemas as ValidationSchemas | undefined)
      );
      const guarded = handlers.some((handler) => handler[AUTHORIZED_REST_ROUTE] === true);
      const path = `/api/${prefix}${layer.route.path === '/' ? '' : layer.route.path}`;
      for (const method of Object.keys(layer.route.methods)) {
        routes.push({ operation: `${method.toUpperCase()} ${path}`, guarded, forms });
      }
    }
  }
  return routes;
}

describe('every REST route that takes a scope is authorized', () => {
  const routes = scopedRoutes();
  const scoped = routes.filter((route) => route.forms.length > 0);

  it('finds the routes and the scoped ones (the walk itself is not broken)', () => {
    expect(routes.length).toBeGreaterThanOrEqual(120);
    expect(routes.some((route) => route.operation.includes('/?'))).toBe(false);
    expect(scoped.map((route) => route.operation)).toEqual(
      expect.arrayContaining([
        'PATCH /api/users/:id',
        'PUT /api/users/:id/email',
        'POST /api/users',
        'GET /api/users',
      ])
    );
  });

  it('mounts every one of them behind authorizeRestRoute', () => {
    const unguarded = scoped
      .filter((route) => !route.guarded && !allowlisted(route.operation))
      .map((route) => `${route.operation} (${route.forms.join(', ')})`);
    expect(unguarded).toEqual([]);
  });

  it('lists no REST route that is guarded or does not take a scope', () => {
    const entries = UNGUARDED_SCOPED_OPERATIONS.filter(
      (entry) => !/^(Query|Mutation)\./.test(entry.operation)
    );
    for (const entry of entries) {
      const route = scoped.find((candidate) => candidate.operation === entry.operation);
      expect(route, `${entry.operation} takes a scope`).toBeDefined();
      expect(route?.guarded, `${entry.operation} is not guarded`).toBe(false);
    }
  });
});
