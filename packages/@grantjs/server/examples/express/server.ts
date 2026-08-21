import 'dotenv/config';

import { GrantClient } from '@grantjs/server';
import { grant } from '@grantjs/server/express';
import express from 'express';

const app = express();
app.use(express.json());

const apiUrl = process.env.GRANT_API_URL;
if (!apiUrl) {
  console.error('Missing GRANT_API_URL. Copy .env.example to .env and set it.');
  process.exit(1);
}

const grantClient = new GrantClient({
  apiUrl,
  getToken: (req: unknown) => {
    const r = req as { headers?: { authorization?: string } };
    const auth = r.headers?.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return process.env.GRANT_TOKEN ?? null;
  },
});

// In-memory store for demo (GET, POST, PUT, PATCH, DELETE)
const documents = new Map<string, { id: string; title: string }>([
  ['doc-1', { id: 'doc-1', title: 'First' }],
  ['doc-2', { id: 'doc-2', title: 'Second' }],
]);

// Resolve document by id for condition evaluation on PUT/PATCH/DELETE
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
app.get(
  '/documents',
  grant(grantClient, { resource: 'document', action: 'query' }),
  (_req, res) => {
    res.json({ data: Array.from(documents.values()) });
  }
);

// POST /documents — Create (Document:Create)
app.post(
  '/documents',
  grant(grantClient, { resource: 'document', action: 'create' }),
  (req, res) => {
    const id = `doc-${Date.now()}`;
    const title = (req.body?.title as string) ?? 'Untitled';
    documents.set(id, { id, title });
    res.status(201).json({ data: { id, title } });
  }
);

// PUT /documents/:id — Update (Document:Update)
app.put(
  '/documents/:id',
  grant(grantClient, {
    resource: 'document',
    action: 'update',
    resourceResolver: documentResourceResolver,
  }),
  (req, res) => {
    const id = req.params.id! as string;
    const doc = documents.get(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const title = (req.body?.title as string) ?? doc.title;
    doc.title = title;
    documents.set(id, doc);
    res.json({ data: doc });
  }
);

// PATCH /documents/:id — Update (Document:Update)
app.patch(
  '/documents/:id',
  grant(grantClient, {
    resource: 'document',
    action: 'update',
    resourceResolver: documentResourceResolver,
  }),
  (req, res) => {
    const id = req.params.id! as string;
    const doc = documents.get(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (req.body?.title != null) doc.title = req.body.title as string;
    documents.set(id, doc);
    res.json({ data: doc });
  }
);

// DELETE /documents/:id — Delete (Document:Delete)
app.delete(
  '/documents/:id',
  grant(grantClient, {
    resource: 'document',
    action: 'delete',
    resourceResolver: documentResourceResolver,
  }),
  (req, res) => {
    const id = req.params.id! as string;
    if (!documents.has(id)) return res.status(404).json({ error: 'Not found' });
    documents.delete(id);
    res.status(204).send();
  }
);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Express example listening on http://localhost:${port}`);
  console.log('  GET    /documents      — Document:Query');
  console.log('  POST   /documents      — Document:Create');
  console.log('  PUT    /documents/:id  — Document:Update');
  console.log('  PATCH  /documents/:id  — Document:Update');
  console.log('  DELETE /documents/:id  — Document:Delete');
  console.log('Use Authorization: Bearer <token> or set GRANT_TOKEN in .env');
});
