/**
 * REST is integrated with OpenAPI and must stay in sync (AGENTS.md). For the projects router this
 * holds the routes and the document to each other, so a route added without its OpenAPI entry, or
 * documented without a route, fails here rather than at the black-box boot-parity oracle, and
 * pins how the by-reference contract of ADR 0009 is described.
 */
import { describe, expect, it, vi } from 'vitest';

import { getOpenApiDocument } from '@/rest/openapi';
import { createProjectsRouter } from '@/rest/routes/projects.routes';
import type { RequestContext } from '@/types';

vi.mock('@/lib/authorization', () => ({
  authorizeRestRoute: () => () => undefined,
  requireEmailThenMfaRest: () => () => undefined,
}));

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

const document = getOpenApiDocument();
type PathItem = Record<
  string,
  | {
      operationId?: string;
      description?: string;
      requestBody?: unknown;
      responses?: Record<string, unknown>;
    }
  | undefined
>;
const paths = (document.paths ?? {}) as Record<string, PathItem>;

function routedOperations(): string[] {
  const router = createProjectsRouter({} as RequestContext);
  return (router.stack as unknown as RouteLayer[])
    .flatMap((layer) =>
      Object.keys(layer.route?.methods ?? {}).map((method) =>
        `${method.toUpperCase()} /api/projects${(layer.route?.path ?? '').replace(/:(\w+)/g, '{$1}')}`.replace(
          /\/$/,
          ''
        )
      )
    )
    .sort();
}

function documentedOperations(): string[] {
  return Object.entries(paths)
    .filter(([path]) => path === '/api/projects' || path.startsWith('/api/projects/'))
    .flatMap(([path, item]) =>
      Object.keys(item)
        .filter((method) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
        .map((method) => `${method.toUpperCase()} ${path}`)
    )
    .sort();
}

describe('the projects router and its OpenAPI document agree', () => {
  it('document every route, and no route that does not exist', () => {
    expect(documentedOperations()).toEqual(routedOperations());
  });

  it('includes the upload URL route', () => {
    expect(documentedOperations()).toContain('POST /api/projects/{id}/sync/upload-url');
  });
});

describe('the by-reference contract is described', () => {
  const schemas = (document.components?.schemas ?? {}) as Record<string, Record<string, unknown>>;

  it('documents the upload URL request and its uploadId response', () => {
    const operation = paths['/api/projects/{id}/sync/upload-url']?.post;

    expect(operation?.operationId).toBe('postApiProjectsByIdSyncUploadUrl');
    expect(Object.keys(operation?.responses ?? {})).toEqual(
      expect.arrayContaining(['200', '400', '401', '403', '413'])
    );

    const request = schemas.RequestProjectSyncUploadUrlRequest as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(Object.keys(request.properties)).toEqual(
      expect.arrayContaining(['scope', 'contentLength', 'contentType'])
    );
    expect(request.required).toEqual(expect.arrayContaining(['scope', 'contentLength']));
    expect(request.required).not.toContain('contentType');

    const response = schemas.RequestProjectSyncUploadUrlResponse as {
      properties: { data: { properties: Record<string, unknown> } };
    };
    expect(Object.keys(response.properties.data.properties)).toEqual(
      expect.arrayContaining(['uploadId', 'url', 'method', 'headers', 'expiresAt'])
    );
  });

  it('documents `source` on the start body, and no longer requires the inline pieces', () => {
    const start = schemas.StartProjectSyncRequest as {
      properties: Record<string, unknown>;
      required: string[];
    };

    expect(start.properties).toHaveProperty('source');
    // Required inline, absent by reference: the rule lives in the body's refinement and in its description.
    expect(start.required).toEqual(expect.arrayContaining(['scope', 'mode']));
    expect(start.required).not.toContain('roles');
    expect(start.required).not.toContain('users');
    expect(start.required).not.toContain('version');
  });

  it('documents that a by-reference refusal is an asynchronous FAILED job, and the 409 and 413', () => {
    const operation = paths['/api/projects/{id}/sync/jobs']?.post;

    expect(operation?.description).toContain('FAILED');
    expect(operation?.description).toContain('CDM_IMPORT_MAX_ENTITIES');
    expect(Object.keys(operation?.responses ?? {})).toEqual(expect.arrayContaining(['409', '413']));
  });

  it('documents that the payload download does not return a by-reference document', () => {
    const operation = paths['/api/projects/{id}/sync/jobs/{jobId}/payload']?.get;

    expect(operation?.description).toContain('"byReference": true');
  });
});
