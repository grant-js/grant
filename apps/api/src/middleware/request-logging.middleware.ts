import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '@/lib/logger';
import { ContextRequest } from '@/types';

import type { ILogger } from '@grantjs/core';

export interface RequestWithLogger extends Request {
  requestId: string;
  logger: ILogger;
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  const contextReq = req as ContextRequest;

  const logContext: Record<string, unknown> = {
    requestId,
  };

  if (contextReq.user) {
    logContext.user = contextReq.user;
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

    const logData = {
      msg: 'Request completed',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    };

    if (res.statusCode >= 500) {
      requestLogger.error(logData);
    } else if (res.statusCode >= 400) {
      requestLogger.warn(logData);
    } else {
      requestLogger.info(logData);
    }
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

export function getRequestLogger(req: Request): ILogger {
  return (req as RequestWithLogger).logger || logger;
}

export function getRequestId(req: Request): string {
  return (req as RequestWithLogger).requestId || 'unknown';
}
