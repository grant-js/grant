import express from 'express';
import * as path from 'path';

import { config } from '@/config';
import { CDM_IMPORT_KEY_PREFIX } from '@/lib/cdm/cdm-import-upload.lib';
import { logger, loggerFactory } from '@/lib/logger';
import { LocalStorageAdapter } from '@/lib/storage';
import { getRequestLogger } from '@/middleware/request-logging.middleware';

/**
 * Express will parse a repeated query key as an array. The signature is bound to
 * four strings, so anything else is treated as missing and refused by
 * `verifyUploadUrl` rather than coerced.
 */
function queryParamString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Whether a request path under `/storage` addresses a CDM import object.
 *
 * Decoded and normalized the way `express.static` will, because that is what decides which
 * file is read: `/%69mports/…`, `/./imports/…`, `/a/../imports/…` and `/IMPORTS/…` (on a
 * case-insensitive filesystem) all reach the same file, and a prefix check on the raw path
 * would pass every one. Anything that will not decode is refused rather than guessed at.
 */
export function addressesCdmImport(requestPath: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return true;
  }
  const normalized = path.posix.normalize(decoded.replace(/\\/g, '/')).replace(/^\/+/, '');
  return `${normalized.toLowerCase()}/`.startsWith(CDM_IMPORT_KEY_PREFIX);
}

export function storageMiddleware(): express.RequestHandler {
  const storagePath = path.resolve(config.storage.local.basePath);

  logger.info({
    msg: 'Static file serving enabled for local storage',
    path: '/storage',
    basePath: storagePath,
  });

  const serveStatic = express.static(storagePath, {
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

  // A CDM import is unredacted (it can carry bring-your-own API key secrets) and is read
  // only by the worker, through `download()`. Everything under `basePath` is otherwise
  // served here, so the prefix is refused *before* the static handler can see it. A 404,
  // not a 403: the response must not confirm that an object exists at a guessed key.
  return (req, res, next) => {
    if (addressesCdmImport(req.path)) {
      res.status(404).end();
      return;
    }
    serveStatic(req, res, next);
  };
}

/**
 * The write half of the local storage mount: `PUT /storage/<path>?exp&len&ct&sig`.
 *
 * A presigned URL is only a capability if something honours it, so the route that
 * accepts one ships with the port method that mints one (ADR 0007). On the S3
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

  // The ceiling on any one PUT: the largest purpose cap, so a CDM import (up to
  // `CDM_UPLOAD_MAX_BYTES`) fits where a picture (`STORAGE_UPLOAD_MAX_FILE_SIZE`) always did.
  // It is a ceiling and not an allowance: each URL still commits to its own exact length,
  // checked below, so a picture URL cannot carry a CDM-sized body.
  const maxUploadBytes = Math.max(
    config.storage.upload.maxFileSize,
    config.storage.cdmImport.maxBytes
  );

  return (req, res, next) => {
    if (req.method !== 'PUT') {
      next();
      return;
    }

    let storagePath: string;
    try {
      storagePath = decodeURIComponent(req.path.replace(/^\//, ''));
    } catch (error) {
      next(error);
      return;
    }

    const params = {
      exp: queryParamString(req.query.exp),
      len: queryParamString(req.query.len),
      ct: queryParamString(req.query.ct),
      sig: queryParamString(req.query.sig),
    };

    // Authenticate the URL *before* reading the body. The ceiling above is 64 MiB by default,
    // and an unauthenticated caller must not be able to make this process buffer that much to
    // learn that its signature was wrong. Once the signature holds, the signed length is the
    // most this request may carry, so the body is read against that, not the ceiling.
    void adapter
      .verifyUploadUrl(storagePath, params)
      .then(({ contentLength: signedLength }) => {
        // `express.json` upstream leaves a non-JSON body unread, and `create-app` keeps it
        // away from a PUT to this mount entirely, since a CDM import *is* JSON.
        const readBody = express.raw({
          type: () => true,
          limit: Math.min(signedLength, maxUploadBytes),
        });

        readBody(req, res, (bodyError?: unknown) => {
          if (bodyError) {
            next(bodyError);
            return;
          }

          const body = Buffer.isBuffer(req.body) ? Buffer.from(req.body) : Buffer.alloc(0);
          const contentLength = Buffer.byteLength(body);
          const contentTypeHeader = req.headers['content-type'];
          const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : undefined;

          void adapter
            .verifyUploadUrl(storagePath, params, { contentType, contentLength })
            .then(async ({ contentType: storedContentType }) => {
              await adapter.upload(body, storagePath, { contentType: storedContentType });
              getRequestLogger(req).info({
                msg: 'Direct upload stored',
                path: storagePath,
                size: contentLength,
              });
              res.status(204).end();
            })
            .catch(next);
        });
      })
      .catch(next);
  };
}
