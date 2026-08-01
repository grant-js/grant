#!/usr/bin/env node
/**
 * Temporary Grant webhook receiver for local dogfooding.
 *
 * Listens on http://localhost:5000/webhooks/grant and appends each callback
 * (headers + body) as an NDJSON line to a temp file.
 *
 * Usage:
 *   node scripts/webhook-receiver.mjs
 *   WEBHOOK_RECEIVER_PORT=5000 WEBHOOK_RECEIVER_FILE=/tmp/grant-webhooks.ndjson node scripts/webhook-receiver.mjs
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const PORT = Number(process.env.WEBHOOK_RECEIVER_PORT ?? 5000);
const HOST = process.env.WEBHOOK_RECEIVER_HOST ?? '0.0.0.0';
const PATH = '/webhooks/grant';
const OUT_FILE = resolve(
  process.env.WEBHOOK_RECEIVER_FILE ?? `${tmpdir()}/grant-webhooks.ndjson`
);

mkdirSync(dirname(OUT_FILE), { recursive: true });

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function pickHeaders(headers) {
  const interesting = [
    'content-type',
    'user-agent',
    'x-request-id',
    'webhook-id',
    'webhook-timestamp',
    'webhook-signature',
    'x-grant-signature',
    'x-grant-timestamp',
    'x-hub-signature-256',
  ];
  const picked = {};
  for (const key of interesting) {
    if (headers[key]) {
      picked[key] = headers[key];
    }
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.startsWith('x-grant') || key.startsWith('webhook-')) {
      picked[key] = value;
    }
  }
  return picked;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === PATH)) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, path: PATH, file: OUT_FILE }));
    return;
  }

  if (req.method === 'POST' && url.pathname === PATH) {
    try {
      const rawBody = await readBody(req);
      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = rawBody;
      }

      const record = {
        receivedAt: new Date().toISOString(),
        method: req.method,
        path: url.pathname,
        headers: pickHeaders(req.headers),
        body,
      };

      appendFileSync(OUT_FILE, `${JSON.stringify(record)}\n`, 'utf8');

      const eventType =
        body && typeof body === 'object'
          ? (body.type ?? body.eventType ?? body.data?.type ?? '?')
          : '?';

      console.log(`[webhook] ${record.receivedAt} ← ${eventType} (${rawBody.length} bytes)`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    } catch (error) {
      console.error('[webhook] failed to handle request', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal_error' }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found', hint: `POST ${PATH}` }));
});

server.listen(PORT, HOST, () => {
  console.log(`[webhook] listening on http://localhost:${PORT}${PATH}`);
  console.log(`[webhook] appending payloads to ${OUT_FILE}`);
});
