import { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { t, translateError } from '@/i18n';
import { GrantException, HttpException, mapDomainToHttp } from '@/lib/errors';
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
    const is4xx = httpError.statusCode >= 400 && httpError.statusCode < 500;

    res.status(httpError.statusCode).json({
      error: localizedMessage,
      code: httpError.code,
      ...(is4xx && error instanceof GrantException && { details: error.message }),
      ...(httpError.translationKey && { translationKey: httpError.translationKey }),
      ...(httpError.translationParams && { translationParams: httpError.translationParams }),
      ...(httpError.extensions && { extensions: httpError.extensions }),
      ...(config.app.isDevelopment && { stack: error.stack }),
    });
    return;
  }

  res.status(500).json({
    error: t(req, 'errors.common.internalError'),
    code: 'INTERNAL_ERROR',
    translationKey: 'errors.common.internalError',
    ...(config.app.isDevelopment && {
      details: error.message,
      stack: error.stack,
    }),
  });
}
