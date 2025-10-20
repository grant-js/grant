import { NextFunction, Request, Response } from 'express';

import { translateError } from '@/i18n';
import { ApiError } from '@/lib/errors';

/**
 * Global error handling middleware
 * Catches all errors thrown in routes/controllers and formats them consistently
 *
 * Usage: Add at the END of your middleware chain in server.ts
 *
 * @example
 * app.use('/api', routes);
 * app.use(errorHandler); // ← Must be LAST
 */
export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Handle ApiError instances with proper status codes and i18n
  if (error instanceof ApiError) {
    const localizedMessage = translateError(req, error);

    res.status(error.statusCode).json({
      error: localizedMessage,
      code: error.code,
      ...(error.extensions && { extensions: error.extensions }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
    return;
  }

  // Handle legacy ValidationError (for backward compatibility)
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: error.message,
      code: 'VALIDATION_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
    return;
  }

  // Handle legacy UnauthorizedError (for backward compatibility)
  if (error.name === 'UnauthorizedError') {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
    return;
  }

  // Default error response for unexpected errors
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      details: error.message,
      stack: error.stack,
    }),
  });
}

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 *
 * Usage: Add BEFORE error handler but AFTER all routes
 *
 * @example
 * app.use('/api', routes);
 * app.use(notFoundHandler); // ← After routes
 * app.use(errorHandler);    // ← Last
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Resource not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
}
