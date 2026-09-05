import type { ILogger } from '@grantjs/core';
import { trace } from '@opentelemetry/api';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { config } from '@/config';
import { getClientIp } from '@/lib/headers.lib';
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
    // `getClientIp`, not `req.ip`: behind an edge that terminates the connection —
    // the Lambda Web Adapter, most visibly — `req.ip` is the loopback address of the
    // proxy's own socket, so every request logged `127.0.0.1` while the rate limiter
    // and the audit record showed the real client. Two different answers to "who
    // called" in one request is a debugging trap, and the log had the useless one.
    ip: getClientIp(req),
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
