import { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';

import { createLogger } from '@/lib/logger';

/**
 * Validation target - where to extract data from the request
 */
export type ValidationType = 'body' | 'query' | 'params' | 'all';

/**
 * Validation schemas for different parts of the request
 */
export interface ValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

/**
 * Format Zod validation errors into a user-friendly structure
 */
function formatZodError(error: ZodError) {
  const errors = error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: errors,
  };
}

/**
 * Middleware factory for validating request data with Zod schemas
 *
 * @example
 * // Validate body only
 * router.post('/users', validate({ body: createUserSchema }), handler);
 *
 * @example
 * // Validate multiple parts
 * router.put('/users/:id', validate({
 *   params: z.object({ id: z.string() }),
 *   body: updateUserSchema
 * }), handler);
 *
 * @example
 * // Validate query parameters
 * router.get('/users', validate({ query: getUsersQuerySchema }), handler);
 */
const logger = createLogger('ValidationMiddleware');

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body if schema provided
      if (schemas.body) {
        logger.debug({ msg: 'Validating body', path: req.path, body: req.body });
        req.body = await schemas.body.parseAsync(req.body);
        logger.debug({ msg: 'Body validation successful', path: req.path });
      }

      // Validate query parameters if schema provided
      if (schemas.query) {
        logger.debug({ msg: 'Validating query', path: req.path, query: req.query });
        const validatedQuery = await schemas.query.parseAsync(req.query);
        // req.query is read-only, so we need to mutate it by clearing and assigning properties
        Object.keys(req.query).forEach((key) => delete (req.query as any)[key]);
        Object.assign(req.query, validatedQuery);
        logger.debug({
          msg: 'Query validation successful',
          path: req.path,
          validatedQuery: req.query,
        });
      }

      // Validate URL parameters if schema provided
      if (schemas.params) {
        logger.debug({ msg: 'Validating params', path: req.path, params: req.params });
        req.params = (await schemas.params.parseAsync(req.params)) as any;
        logger.debug({ msg: 'Params validation successful', path: req.path });
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.debug({
          msg: 'Zod validation error',
          path: req.path,
          errors: error.issues,
        });
        return res.status(400).json(formatZodError(error));
      }

      // Handle unexpected errors
      logger.error(
        {
          msg: 'Unexpected validation error',
          path: req.path,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          query: req.query,
          body: req.body,
          params: req.params,
        },
        'Validation middleware error'
      );

      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Simpler validation middleware for body-only validation
 *
 * @example
 * router.post('/users', validateBody(createUserSchema), handler);
 */
export function validateBody(schema: z.ZodSchema) {
  return validate({ body: schema });
}

/**
 * Simpler validation middleware for query-only validation
 *
 * @example
 * router.get('/users', validateQuery(getUsersQuerySchema), handler);
 */
export function validateQuery(schema: z.ZodSchema) {
  return validate({ query: schema });
}

/**
 * Simpler validation middleware for params-only validation
 *
 * @example
 * router.get('/users/:id', validateParams(idParamsSchema), handler);
 */
export function validateParams(schema: z.ZodSchema) {
  return validate({ params: schema });
}
