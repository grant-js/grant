import { GrantException } from '@grantjs/core';

import { HttpException, mapDomainToHttp } from '@/lib/errors';
import { NextFunction, Request, Response } from 'express';

import { translateError } from '@/i18n';
import { getRequestLogger } from '@/middleware/request-logging.middleware';

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestLogger = getRequestLogger(req);
  requestLogger.error({
    msg: 'API Error',
    err: error,
    path: req.path,
    method: req.method,
  });

  // Map domain errors to HTTP errors
  let httpError: HttpException | undefined;

  if (error instanceof GrantException) {
    httpError = mapDomainToHttp(error);
  } else if (error instanceof HttpException) {
    httpError = error;
  }

  if (httpError) {
    const localizedMessage = translateError(req, httpError);

    res.status(httpError.statusCode).json({
      error: localizedMessage,
      code: httpError.code,
      ...(httpError.extensions && { extensions: httpError.extensions }),
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
