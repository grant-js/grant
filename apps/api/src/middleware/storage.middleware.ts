import express from 'express';
import * as path from 'path';

import { config } from '@/config';
import { logger, loggerFactory } from '@/lib/logger';
import { LocalStorageAdapter } from '@/lib/storage';
import { getRequestLogger } from '@/middleware/request-logging.middleware';

export function storageMiddleware(): express.RequestHandler {
  const storagePath = path.resolve(config.storage.local.basePath);

  logger.info({
    msg: 'Static file serving enabled for local storage',
    path: '/storage',
    basePath: storagePath,
  });

  return express.static(storagePath, {
    dotfiles: 'deny',
    etag: true,
    lastModified: true,
    maxAge: 31536000,
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (config.storage.local.contentTypes[ext]) {
        res.setHeader('Content-Type', config.storage.local.contentTypes[ext]);
      }
    },
  });
}

/**
 * The write half of the local storage mount: `PUT /storage/<path>?exp&len&ct&sig`.
 *
 * A presigned URL is only a capability if something honours it, so the route that
 * accepts one ships with the port method that mints one (ADR 0006). On the S3
 * target this has no counterpart — the client writes to the bucket and never
 * reaches this process, which is the whole point of part D.
 *
 * The route is deliberately thin. Every rule about what a minted URL permits —
 * signature, expiry, exact length, exact content type — lives in
 * `LocalStorageAdapter.verifyUploadUrl`, so this and the conformance suite's
 * throwaway server enforce identically rather than each carrying a copy.
 */
export function uploadMiddleware(): express.RequestHandler {
  const adapter = new LocalStorageAdapter(
    { basePath: config.storage.local.basePath },
    loggerFactory.createLogger('LocalStorageAdapter')
  );

  // `express.json` upstream leaves a non-JSON body unread, so the stream is still
  // ours. The cap here is the *policy* maximum, not the URL's: a body over it is
  // refused by body-parser before a byte is buffered, and the URL's own exact
  // length is checked afterwards by `verifyUploadUrl`.
  const readBody = express.raw({
    type: () => true,
    limit: config.storage.upload.maxFileSize,
  });

  return (req, res, next) => {
    if (req.method !== 'PUT') {
      next();
      return;
    }

    readBody(req, res, (bodyError?: unknown) => {
      if (bodyError) {
        next(bodyError);
        return;
      }

      const storagePath = decodeURIComponent(req.path.replace(/^\//, ''));
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const query = req.query as Record<string, string | undefined>;

      void adapter
        .verifyUploadUrl(
          storagePath,
          { exp: query.exp, len: query.len, ct: query.ct, sig: query.sig },
          { contentType: req.headers['content-type'], contentLength: body.length }
        )
        .then(async ({ contentType }) => {
          await adapter.upload(body, storagePath, { contentType });
          getRequestLogger(req).info({
            msg: 'Direct upload stored',
            path: storagePath,
            size: body.length,
          });
          res.status(204).end();
        })
        .catch(next);
    });
  };
}
