import { GrantException, ValidationError } from '@/lib/errors';

/**
 * Object keys, content type and refusal codes for a CDM import sent by reference
 * (ADR 0009).
 */

/**
 * First segment of every import key, deliberately ahead of the tenant segment so one S3
 * lifecycle rule can expire `imports/` without matching anything else in the bucket. Also
 * the prefix the local static mount refuses to serve and `getUrl()` refuses to resolve:
 * the document is unredacted and is never publicly readable.
 */
export const CDM_IMPORT_KEY_PREFIX = 'imports/';

export const CDM_IMPORT_CONTENT_TYPE = 'application/json';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether `path` addresses an import object, whatever its case. */
export function isCdmImportKey(path: string): boolean {
  return path.toLowerCase().startsWith(CDM_IMPORT_KEY_PREFIX);
}

/**
 * The upload id as a canonical, lower-case UUID.
 *
 * Client-supplied on the start request, so it is checked before it becomes part of a
 * key. Lower-cased because the key is what the unique index and the store compare, and
 * `ABC…` and `abc…` must not be two different uploads on a case-insensitive filesystem.
 */
export function normalizeUploadId(uploadId: string): string {
  if (!UUID_PATTERN.test(uploadId)) {
    throw new ValidationError('source.uploadId must be the uploadId returned by the upload URL');
  }
  return uploadId.toLowerCase();
}

/**
 * The object key for a project's import upload.
 *
 * Derived, never accepted: `projectId` comes from the authorized project scope and
 * `uploadId` is minted by the server, so a client cannot steer a presigned URL, or a read,
 * to another tenant's prefix.
 */
export function cdmImportObjectKey(projectId: string, uploadId: string): string {
  if (!UUID_PATTERN.test(projectId)) {
    throw new ValidationError('Project id is not a valid UUID');
  }
  return `${CDM_IMPORT_KEY_PREFIX}projects/${projectId.toLowerCase()}/${normalizeUploadId(uploadId)}.json`;
}

/** Media type without parameters, lower-cased: `application/json; charset=utf-8` → `application/json`. */
export function baseMediaType(contentType: string): string {
  return (contentType.split(';')[0] ?? '').trim().toLowerCase();
}

/**
 * Why the worker refused a by-reference document. The code is the first token of the
 * job's `errorMessage` (`CDM_IMPORT_TOO_MANY_ENTITIES: …`), because the polled job
 * exposes the message and not `errorDetails`.
 */
export const CdmImportRefusal = {
  /** The object is gone: expired by the lifecycle rule, or deleted. */
  UploadMissing: 'CDM_IMPORT_UPLOAD_MISSING',
  /** The object is larger than `CDM_UPLOAD_MAX_BYTES`. */
  DocumentTooLarge: 'CDM_IMPORT_DOCUMENT_TOO_LARGE',
  /** The object is not JSON. */
  DocumentNotJson: 'CDM_IMPORT_DOCUMENT_NOT_JSON',
  /** The JSON is not a valid CDM document, or breaks the rules the inline path enforces. */
  DocumentInvalid: 'CDM_IMPORT_DOCUMENT_INVALID',
  /** The document's `mode` or `version` is not the request's. */
  RequestMismatch: 'CDM_IMPORT_REQUEST_MISMATCH',
  /** More entities than `CDM_IMPORT_MAX_ENTITIES`. */
  TooManyEntities: 'CDM_IMPORT_TOO_MANY_ENTITIES',
  /** The store failed for a reason of its own. */
  StorageFailure: 'CDM_IMPORT_STORAGE_FAILURE',
} as const;

export type CdmImportRefusalCode = (typeof CdmImportRefusal)[keyof typeof CdmImportRefusal];

/**
 * A by-reference import the worker will not apply. Raised before the import transaction
 * opens, so nothing was changed.
 */
export class CdmImportRefusedError extends GrantException {
  constructor(
    public readonly refusal: CdmImportRefusalCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
    originalError?: Error
  ) {
    super(`${refusal}: ${message}`, refusal, originalError);
  }
}
