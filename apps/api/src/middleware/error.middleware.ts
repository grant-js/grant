import { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { t, translateError } from '@/i18n';
import {
  BadRequestError,
  GrantException,
  HttpException,
  mapDomainToHttp,
  PayloadTooLargeError,
} from '@/lib/errors';
import { getRequestLogger } from '@/middleware/request-logging.middleware';

/**
 * `body-parser`'s errors, as domain errors.
 *
 * Without this both arrive here as plain `Error`s, miss the `GrantException` and
 * `HttpException` checks below, and fall through to the generic `500 INTERNAL_ERROR` —
 * verified against a running container, not inferred, in
 * `plans/2026-08-21-aws-lambda-runtime-measurements.md` § finding 4. A caller who sent
 * 11 MiB was told the server had a bug, and a caller who sent `{not json` was told the
 * same thing.
 *
 * **Discriminated on `err.type`, never on the class name.** `body-parser` sets `type`
 * deliberately as its public discriminator; `PayloadTooLargeError` and `SyntaxError` are
 * its internals, and `SyntaxError` in particular is a built-in that any dependency can
 * throw for unrelated reasons. Matching the class would couple this file to a transitive
 * dependency and would misclassify a genuine parse bug elsewhere in the stack as a
 * client error.
 */
interface BodyParserError extends Error {
  type?: string;
  limit?: number;
  length?: number;
}

function asDomainError(error: Error): GrantException | undefined {
  const { type, limit, length } = error as BodyParserError;

  if (type === 'entity.too.large') {
    return new PayloadTooLargeError('Request body is too large', limit, length, error);
  }

  if (type === 'entity.parse.failed') {
    return new BadRequestError('Request body is not valid JSON', error);
  }

  return undefined;
}

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestLogger = getRequestLogger(req);
  requestLogger.error({
    msg: 'API Error',
    err: error,
    path: req.path,
    method: req.method,
  });

  // Map domain errors to HTTP errors. `body-parser`'s two are translated first, so they
  // reach `mapDomainToHttp` as the domain errors they describe rather than as the 500
  // every unrecognized Error becomes.
  const domainError = error instanceof GrantException ? error : asDomainError(error);

  let httpError: HttpException | undefined;

  if (domainError) {
    httpError = mapDomainToHttp(domainError);
  } else if (error instanceof HttpException) {
    httpError = error;
  }

  if (httpError) {
    const localizedMessage = translateError(req, httpError);
    const is4xx = httpError.statusCode >= 400 && httpError.statusCode < 500;

    res.status(httpError.statusCode).json({
      error: localizedMessage,
      code: httpError.code,
      // `domainError`, not `error`: a translated body-parser error is a GrantException
      // that the caught `error` is not, and without this its 4xx body would carry no
      // `details` while every other 4xx does.
      ...(is4xx && domainError && { details: domainError.message }),
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
