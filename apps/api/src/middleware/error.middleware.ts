import { NextFunction, Request, Response } from 'express';

import { translateError } from '@/i18n';
import { ApiError } from '@/lib/errors';
import { getRequestLogger } from '@/middleware/request-logging.middleware';

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestLogger = getRequestLogger(req);
  requestLogger.error({
    msg: 'API Error',
    err: error,
    path: req.path,
    method: req.method,
  });

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

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      details: error.message,
      stack: error.stack,
    }),
  });
}
