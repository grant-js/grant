import { Request } from 'express';
import { z } from 'zod';

/**
 * Generic typed request configuration
 * Allows typing any combination of request properties
 */
interface TypedRequestConfig<Body = unknown, Params = unknown, Query = unknown> {
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
