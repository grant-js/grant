import { Request } from 'express';
import { z } from 'zod';

/**
 * Utility type to infer types from Zod schemas
 */
export type InferBody<T extends z.ZodTypeAny> = z.infer<T>;
export type InferQuery<T extends z.ZodTypeAny> = z.infer<T>;
export type InferParams<T extends z.ZodTypeAny> = z.infer<T>;

/**
 * Generic typed request configuration
 * Allows typing any combination of request properties
 */
export interface TypedRequestConfig<Body = unknown, Params = unknown, Query = unknown> {
  body?: Body;
  params?: Params;
  query?: Query;
}

/**
 * Main typed request interface
 * Generic interface that can type any combination of request properties
 *
 * @example
 * // Type only body
 * TypedRequest<{ body: typeof createUserSchema }>
 *
 * @example
 * // Type body and audience
 * TypedRequest<{ body: typeof loginSchema; audience: string }>
 *
 * @example
 * // Type body, params, and user (requires authentication)
 * TypedRequest<{
 *   body: typeof updateSchema;
 *   params: typeof idSchema;
 *   user: GrantAuth
 * }>
 *
 * @example
 * // Type query and params
 * TypedRequest<{
 *   query: typeof getUsersQuerySchema;
 *   params: typeof getUserParamsSchema
 * }>
 *
 * @example
 * // Type everything
 * TypedRequest<{
 *   body: typeof createSchema;
 *   params: typeof idSchema;
 *   query: typeof searchSchema;
 *   user: GrantAuth;
 *   audience: string;
 * }>
 */
export interface TypedRequest<
  Config extends TypedRequestConfig = TypedRequestConfig,
> extends Request {
  body: Config['body'] extends z.ZodTypeAny ? z.infer<Config['body']> : Config['body'];
  params: Config['params'] extends z.ZodTypeAny
    ? z.infer<Config['params']> & Record<string, string>
    : Config['params'] & Record<string, string>;
  query: Config['query'] extends z.ZodTypeAny
    ? z.infer<Config['query']> & Record<string, string | string[]>
    : Config['query'] & Record<string, string | string[]>;
}

/**
 * Typed request with only body validation
 */
export interface TypedRequestBody<T extends z.ZodTypeAny> extends Request {
  body: z.infer<T>;
}

/**
 * Typed request with only params validation
 */
export interface TypedRequestParams<T extends z.ZodTypeAny> extends Request {
  params: z.infer<T> & Record<string, string>;
}

/**
 * Typed request with only query validation
 */
export interface TypedRequestQuery<T extends z.ZodTypeAny> extends Request {
  query: z.infer<T> & Record<string, string | string[]>;
}

/**
 * Typed request with body and params validation
 */
export interface TypedRequestBodyParams<
  BodySchema extends z.ZodTypeAny,
  ParamsSchema extends z.ZodTypeAny,
> extends Request {
  body: z.infer<BodySchema>;
  params: z.infer<ParamsSchema> & Record<string, string>;
}

/**
 * Typed request with body and query validation
 */
export interface TypedRequestBodyQuery<
  BodySchema extends z.ZodTypeAny,
  QuerySchema extends z.ZodTypeAny,
> extends Request {
  body: z.infer<BodySchema>;
  query: z.infer<QuerySchema> & Record<string, string | string[]>;
}

/**
 * Typed request with params and query validation
 */
export interface TypedRequestParamsQuery<
  ParamsSchema extends z.ZodTypeAny,
  QuerySchema extends z.ZodTypeAny,
> extends Request {
  params: z.infer<ParamsSchema> & Record<string, string>;
  query: z.infer<QuerySchema> & Record<string, string | string[]>;
}

/**
 * Typed request with all three validations (body, params, query)
 */
export interface TypedRequestAll<
  BodySchema extends z.ZodTypeAny,
  ParamsSchema extends z.ZodTypeAny,
  QuerySchema extends z.ZodTypeAny,
> extends Request {
  body: z.infer<BodySchema>;
  params: z.infer<ParamsSchema> & Record<string, string>;
  query: z.infer<QuerySchema> & Record<string, string | string[]>;
}
