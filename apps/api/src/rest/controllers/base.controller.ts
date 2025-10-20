import { Response } from 'express';

import { Handlers } from '@/handlers';
import { AuthenticatedUser } from '@/types/auth';
import { RequestContext } from '@/types/context';

/**
 * Base controller class with common response helpers
 *
 * Error Handling Strategy:
 * - Controllers should NOT catch errors (no try-catch needed!)
 * - Just throw ApiError instances from business logic
 * - The global error middleware will translate, format, and send the response
 *
 * @example
 * // ❌ Old way (DON'T do this)
 * async getUser(req, res) {
 *   try {
 *     const user = await this.handlers.users.getUser(id);
 *     return this.success(res, user);
 *   } catch (error) {
 *     return this.handleError(res, error, 'getUser');
 *   }
 * }
 *
 * // ✅ New way (DO this - much cleaner!)
 * async getUser(req, res) {
 *   const user = await this.handlers.users.getUser(id);
 *   return this.success(res, user);
 * }
 * // Errors automatically caught by error middleware!
 */
export abstract class BaseController {
  protected context: RequestContext;
  protected handlers: Handlers;
  protected user: AuthenticatedUser | null;
  protected origin: string;

  constructor(context: RequestContext) {
    this.context = context;
    this.handlers = context.handlers;
    this.user = context.user;
    this.origin = context.origin;
  }

  /**
   * Send a success response with optional status code
   * @param res - Express response object
   * @param data - Response data
   * @param statusCode - HTTP status code (default: 200, use 201 for created resources)
   */
  protected success(res: Response, data: object, statusCode: number = 200) {
    res.status(statusCode).json({
      success: true,
      data,
    });
  }
}
