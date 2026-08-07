import type { ILogger } from '@grantjs/core';
import { trace } from '@opentelemetry/api';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { config } from '@/config';
import { logger } from '@/lib/logger';
import { getTelemetryAdapter } from '@/lib/telemetry';
import { ContextRequest } from '@/types';

interface RequestWithLogger extends Request {
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

  if (config.tracing.enabled) {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute('http.request_id', requestId);
      if (contextReq.user?.userId) {
        span.setAttribute('http.user_id', contextReq.user.userId);
      }
    }
  }

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

    if (config.telemetry.provider !== 'none') {
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      getTelemetryAdapter()
        .sendLog({
          message: logData.msg,
          level,
          timestamp: new Date().toISOString(),
          requestId,
          fields: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
          },
        })
        .catch((err: unknown) => {
          requestLogger.error({
            msg: 'Telemetry sendLog failed',
            err,
          });
        });
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
