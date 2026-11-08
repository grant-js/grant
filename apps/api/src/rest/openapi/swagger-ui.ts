import type { RequestHandler } from 'express';
import swaggerUi, { type SwaggerUiOptions } from 'swagger-ui-express';

/**
 * Where the Swagger UI page fetches the OpenAPI document from. Relative to the page,
 * which is served at `/api-docs/`, so it resolves to the `/api-docs.json` route on the
 * same origin and keeps working when a gateway mounts the API under a path prefix.
 */
const SPEC_URL = '../api-docs.json';

/**
 * Handlers for the Swagger UI at `/api-docs`.
 *
 * The page loads the document from `/api-docs.json` instead of having it inlined.
 * swagger-ui-express inlines a document into `swagger-ui-init.js` with
 * `String.prototype.replace`, which reads "$`", "$'" and "$&" anywhere in the document
 * as replacement patterns. One description containing "`$2a$`" (the CDM bcrypt hash)
 * was enough to corrupt the script and leave the page blank. Loading by URL keeps
 * document text out of the script, so no description can break it, and the script no
 * longer carries a copy of the document.
 *
 * Setting `swaggerUrl` also means a `?url=` query parameter can no longer load some
 * other document into this page.
 */
export function createSwaggerUiHandlers(options: SwaggerUiOptions): RequestHandler[] {
  return [...swaggerUi.serve, swaggerUi.setup(undefined, { ...options, swaggerUrl: SPEC_URL })];
}
