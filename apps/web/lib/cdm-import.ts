/**
 * Client-side knowledge about CDM imports that travel by reference (ADR 0009).
 *
 * Pure functions and constants only — no React, no Apollo — so the dialog, the job
 * detail and the tests share one definition of what the server's codes and stubs look
 * like.
 */

/**
 * Largest file the browser parses before upload.
 *
 * Parsing is only worth doing where it is cheap: it feeds the preview (version, mode,
 * counts), the job name and the `entityCount` hint. `JSON.parse` of a document this size
 * takes well under a second and a few tens of MiB of heap; at the server's 64 MiB ceiling
 * it freezes the tab and holds the text and the object graph in memory together, to
 * produce a preview nobody needs, because the worker validates the document anyway.
 * Above the threshold the file goes up unparsed and the server is the only judge.
 */
export const CDM_BROWSER_PARSE_MAX_BYTES = 8 * 1024 * 1024;

/** The only content type a CDM import upload may carry. */
export const CDM_UPLOAD_CONTENT_TYPE = 'application/json';

const MEBIBYTE = 1024 * 1024;

/**
 * Shape check the dialog has always applied before offering a file for import: enough
 * to tell a CDM document from arbitrary JSON, not a validation. The server validates.
 */
export interface CdmPayloadShape {
  version: number;
  id?: string;
  mode: { strategy: string; onConflict?: string; confirmDestructive?: boolean };
  roles: unknown[];
  users: unknown[];
  resources?: unknown[];
  permissions?: unknown[];
  groups?: unknown[];
  tags?: unknown[];
}

export function isCdmPayloadShape(value: unknown): value is CdmPayloadShape {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.version !== 'number') return false;
  if (!candidate.mode || typeof candidate.mode !== 'object') return false;
  const mode = candidate.mode as Record<string, unknown>;
  if (typeof mode.strategy !== 'string') return false;
  if (!Array.isArray(candidate.roles)) return false;
  if (!Array.isArray(candidate.users)) return false;
  if (candidate.resources !== undefined && !Array.isArray(candidate.resources)) return false;
  if (candidate.permissions !== undefined && !Array.isArray(candidate.permissions)) return false;
  if (candidate.groups !== undefined && !Array.isArray(candidate.groups)) return false;
  if (candidate.tags !== undefined && !Array.isArray(candidate.tags)) return false;
  return true;
}

/**
 * Entities in a document, in the unit the server's `CDM_IMPORT_MAX_ENTITIES` cap and the
 * `source.entityCount` hint use: roles, users, resources, permissions, groups and tags.
 */
export function countCdmEntities(
  document: Pick<
    CdmPayloadShape,
    'roles' | 'users' | 'resources' | 'permissions' | 'groups' | 'tags'
  >
): number {
  return (
    document.roles.length +
    document.users.length +
    (document.resources?.length ?? 0) +
    (document.permissions?.length ?? 0) +
    (document.groups?.length ?? 0) +
    (document.tags?.length ?? 0)
  );
}

/**
 * Why the worker refused a by-reference document. The server puts the code first in the
 * job's `errorMessage` (`CDM_IMPORT_TOO_MANY_ENTITIES: …`) because a polled job exposes
 * the message and not its error details. Keep in step with `CdmImportRefusal` in
 * `apps/api/src/lib/cdm/cdm-import-upload.lib.ts`.
 */
export const CDM_IMPORT_ERROR_CODES = [
  'CDM_IMPORT_TOO_MANY_ENTITIES',
  'CDM_IMPORT_DOCUMENT_INVALID',
  'CDM_IMPORT_DOCUMENT_NOT_JSON',
  'CDM_IMPORT_REQUEST_MISMATCH',
  'CDM_IMPORT_UPLOAD_MISSING',
  'CDM_IMPORT_DOCUMENT_TOO_LARGE',
  'CDM_IMPORT_STORAGE_FAILURE',
] as const;

type CdmImportErrorCode = (typeof CDM_IMPORT_ERROR_CODES)[number];

export interface ParsedCdmImportError {
  code: CdmImportErrorCode;
  /** The server's own sentence after the code, in English; may be empty. */
  detail: string;
}

/**
 * Splits a job's `errorMessage` into a known refusal code and the server's detail.
 * Returns `null` for anything else (a legacy job, an unexpected failure), which the
 * caller shows as-is.
 */
export function parseCdmImportError(
  errorMessage: string | null | undefined
): ParsedCdmImportError | null {
  if (!errorMessage) return null;
  const match = /^(CDM_IMPORT_[A-Z_]+)(?::\s*([\s\S]*))?$/.exec(errorMessage.trim());
  if (!match) return null;
  const code = match[1];
  if (!(CDM_IMPORT_ERROR_CODES as readonly string[]).includes(code)) return null;
  return { code: code as CdmImportErrorCode, detail: (match[2] ?? '').trim() };
}

/** What `GET .../sync/jobs/{jobId}/payload` answers for a by-reference job. */
export interface ByReferencePayloadStub {
  byReference: true;
  sizeBytes: number;
}

export function isByReferencePayload(value: unknown): value is ByReferencePayloadStub {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.byReference === true && typeof candidate.sizeBytes === 'number';
}

/** Whole bytes as MiB for display: at most two decimals, never a misleading "0". */
export function formatMebibytes(bytes: number): string {
  const mebibytes = bytes / MEBIBYTE;
  if (mebibytes > 0 && mebibytes < 0.01) return '<0.01';
  return String(Number(mebibytes.toFixed(2)));
}

/**
 * The limit the API reports when it refuses an upload for size, read from the error the
 * mint mutation returned; `undefined` when the error is anything else. The mint refuses
 * with the domain code `PAYLOAD_TOO_LARGE` (HTTP 413) and puts `limitBytes` in the
 * extensions, so a client can act on it without parsing prose.
 */
export function readPayloadTooLarge(error: unknown): { limitBytes?: number } | undefined {
  const candidates: unknown[] = [];
  if (error && typeof error === 'object') {
    const record = error as { errors?: unknown; graphQLErrors?: unknown };
    for (const list of [record.errors, record.graphQLErrors]) {
      if (Array.isArray(list)) candidates.push(...list);
    }
  }
  for (const candidate of candidates) {
    const extensions = (candidate as { extensions?: Record<string, unknown> } | null)?.extensions;
    if (extensions?.code === 'PAYLOAD_TOO_LARGE') {
      const limit = extensions.limitBytes;
      return typeof limit === 'number' ? { limitBytes: limit } : {};
    }
  }
  return undefined;
}
