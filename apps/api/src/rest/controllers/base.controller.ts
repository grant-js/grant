import { Response } from 'express';

import { Handlers } from '@/handlers';
import { AuthenticatedUser } from '@/types/auth';
import { RequestContext } from '@/types/context';

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
