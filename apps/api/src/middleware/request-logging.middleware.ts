import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '@/lib/logger';
import { AuthenticatedRequest } from '@/types';

import type { Logger } from 'pino';

export interface RequestWithLogger extends Request {
  requestId: string;
  logger: Logger;
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  const authReq = req as AuthenticatedRequest;

  const logContext: Record<string, unknown> = {
    requestId,
  };

  if (authReq.user) {
    logContext.user = authReq.user;
  }

  const requestLogger = logger.child(logContext);

  const requestWithLogger = req as RequestWithLogger;
  requestWithLogger.requestId = requestId;
  requestWithLogger.logger = requestLogger;

  res.setHeader('X-Request-ID', requestId);

  requestLogger.info({
    msg: 'Incoming request',
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    requestLogger[level]({
      msg: 'Request completed',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      requestLogger.warn({
        msg: 'Request connection closed prematurely',
        method: req.method,
        path: req.path,
      });
    }
  });

  next();
}

export function getRequestLogger(req: Request): Logger {
  return (req as RequestWithLogger).logger || logger;
}

export function getRequestId(req: Request): string {
  return (req as RequestWithLogger).requestId || 'unknown';
}
