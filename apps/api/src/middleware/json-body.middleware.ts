import express from 'express';

import { config } from '@/config';

/**
 * `express.json`, except for the bytes of a direct upload.
 *
 * A PUT to the local storage mount carries a file the client was handed a signed URL for,
 * and since ADR 0009 that file can be a CDM import, whose content type is
 * `application/json`. `express.json` would claim it first: refuse it past
 * `API_JSON_BODY_LIMIT_BYTES` (the very limit by-reference exists to get around), or parse it
 * into an object that `uploadMiddleware` can no longer read as bytes. Those requests are
 * left alone here and read by `uploadMiddleware`, against the length its URL signed.
 */
export function jsonBodyParser(): express.RequestHandler {
  const parseJson = express.json({ limit: config.app.jsonBodyLimitBytes });
  const readsUploadsItself = config.storage.provider === 'local';

  return function jsonBodyParser(req, res, next) {
    if (readsUploadsItself && req.method === 'PUT' && req.path.startsWith('/storage/')) {
      next();
      return;
    }
    parseJson(req, res, next);
  };
}
