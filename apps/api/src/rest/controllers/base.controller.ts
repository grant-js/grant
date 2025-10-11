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

  protected handleError(
    res: Response,
    error: any,
    contextOrStatusCode: string | number = 'unknown',
    statusCodeOverride?: number
  ) {
    const context = typeof contextOrStatusCode === 'string' ? contextOrStatusCode : 'unknown';
    const statusCode =
      statusCodeOverride ||
      (typeof contextOrStatusCode === 'number' ? contextOrStatusCode : error.statusCode || 500);

    console.error(`REST Controller Error (${context}):`, error);

    res.status(statusCode).json({
      error: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: error,
      }),
    });
  }

  protected ok(res: Response, data: any) {
    res.status(200).json({
      success: true,
      data,
    });
  }

  protected created(res: Response, data: any) {
    res.status(201).json({
      success: true,
      data,
    });
  }

  protected success(res: Response, data: any, statusCode: number = 200) {
    res.status(statusCode).json({
      success: true,
      data,
    });
  }

  protected paginatedResponse(res: Response, data: any, pagination: any) {
    res.json({
      success: true,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || data.length,
        pages: Math.ceil((pagination.total || data.length) / (pagination.limit || 10)),
      },
    });
  }
}
