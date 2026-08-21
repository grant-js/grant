import 'dotenv/config';

import { GrantClient } from '@grantjs/server';
import { grant } from '@grantjs/server/fastify';
import Fastify from 'fastify';

const fastify = Fastify({ logger: false });

const apiUrl = process.env.GRANT_API_URL;
if (!apiUrl) {
  console.error('Missing GRANT_API_URL. Copy .env.example to .env and set it.');
  process.exit(1);
}

const grantClient = new GrantClient({
  apiUrl,
  getToken: (request: unknown) => {
    const req = request as { headers?: { authorization?: string } };
    const auth = req.headers?.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return process.env.GRANT_TOKEN ?? null;
  },
});

// In-memory store for demo (GET, POST, PUT, PATCH, DELETE)
const documents = new Map<string, { id: string; title: string }>([
  ['doc-1', { id: 'doc-1', title: 'First' }],
  ['doc-2', { id: 'doc-2', title: 'Second' }],
]);

const documentResourceResolver = async ({
  request,
}: {
  resourceSlug: string;
  request: unknown;
}) => {
  const req = request as { params?: { id?: string } };
  const id = req.params?.id;
  if (!id) return null;
  const doc = documents.get(id);
  return doc ? { id: doc.id, title: doc.title } : null;
};

// GET /documents — List (Document:Query)
fastify.get(
  '/documents',
  { preHandler: grant(grantClient, { resource: 'document', action: 'query' }) },
  async () => ({ data: Array.from(documents.values()) })
);

// POST /documents — Create (Document:Create)
fastify.post(
  '/documents',
  { preHandler: grant(grantClient, { resource: 'document', action: 'create' }) },
  async (request, reply) => {
    const body = request.body as { title?: string } | undefined;
    const id = `doc-${Date.now()}`;
    const title = body?.title ?? 'Untitled';
    documents.set(id, { id, title });
    reply.status(201);
    return { data: { id, title } };
  }
);

// PUT /documents/:id — Update (Document:Update)
fastify.put(
  '/documents/:id',
  {
    preHandler: grant(grantClient, {
      resource: 'document',
      action: 'update',
      resourceResolver: documentResourceResolver,
    }),
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };
    const doc = documents.get(id);
    if (!doc) {
      reply.status(404);
      return { error: 'Not found' };
    }
    const body = request.body as { title?: string } | undefined;
    const title = body?.title ?? doc.title;
    doc.title = title;
    documents.set(id, doc);
    return { data: doc };
  }
);

// PATCH /documents/:id — Update (Document:Update)
fastify.patch(
  '/documents/:id',
  {
    preHandler: grant(grantClient, {
      resource: 'document',
      action: 'update',
      resourceResolver: documentResourceResolver,
    }),
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };
    const doc = documents.get(id);
    if (!doc) {
      reply.status(404);
      return { error: 'Not found' };
    }
    const body = request.body as { title?: string } | undefined;
    if (body?.title != null) doc.title = body.title;
    documents.set(id, doc);
    return { data: doc };
  }
);

// DELETE /documents/:id — Delete (Document:Delete)
fastify.delete(
  '/documents/:id',
  {
    preHandler: grant(grantClient, {
      resource: 'document',
      action: 'delete',
      resourceResolver: documentResourceResolver,
    }),
  },
  async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!documents.has(id)) {
      reply.status(404);
      return { error: 'Not found' };
    }
    documents.delete(id);
    return reply.status(204).send();
  }
);

const port = Number(process.env.PORT) || 3000;
fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Fastify example listening on ${address}`);
  console.log('  GET    /documents      — Document:Query');
  console.log('  POST   /documents      — Document:Create');
  console.log('  PUT    /documents/:id  — Document:Update');
  console.log('  PATCH  /documents/:id  — Document:Update');
  console.log('  DELETE /documents/:id  — Document:Delete');
  console.log('Use Authorization: Bearer <token> or set GRANT_TOKEN in .env');
});
