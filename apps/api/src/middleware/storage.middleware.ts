import * as path from 'path';

import express from 'express';

import { config } from '@/config';
import { logger } from '@/lib/logger';

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
