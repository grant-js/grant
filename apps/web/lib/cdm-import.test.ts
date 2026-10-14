import { describe, expect, it } from 'vitest';

import {
  CDM_BROWSER_PARSE_MAX_BYTES,
  CDM_IMPORT_ERROR_CODES,
  countCdmEntities,
  formatMebibytes,
  isByReferencePayload,
  isCdmPayloadShape,
  parseCdmImportError,
  readPayloadTooLarge,
} from './cdm-import';

describe('countCdmEntities', () => {
  it('adds roles, users, resources, permissions, groups and tags, and treats absent sections as empty', () => {
    expect(
      countCdmEntities({
        roles: [1, 2],
        users: [1],
        resources: [1, 2, 3],
        permissions: [1],
        groups: [1, 2],
        tags: [1],
      })
    ).toBe(10);
    expect(countCdmEntities({ roles: [1], users: [] })).toBe(1);
  });
});

describe('isCdmPayloadShape', () => {
  const valid = { version: 1, mode: { strategy: 'merge' }, roles: [], users: [] };

  it('accepts the minimum a CDM document needs', () => {
    expect(isCdmPayloadShape(valid)).toBe(true);
  });

  it.each([
    ['null', null],
    ['no version', { ...valid, version: undefined }],
    ['no mode.strategy', { ...valid, mode: {} }],
    ['roles that are not an array', { ...valid, roles: {} }],
    ['an optional section that is not an array', { ...valid, tags: 'x' }],
  ])('rejects %s', (_label, value) => {
    expect(isCdmPayloadShape(value)).toBe(false);
  });
});

describe('parseCdmImportError', () => {
  it.each(CDM_IMPORT_ERROR_CODES)('recognises %s as the first token of the message', (code) => {
    expect(parseCdmImportError(`${code}: something specific`)).toEqual({
      code,
      detail: 'something specific',
    });
  });

  it('returns an empty detail when the message is only the code', () => {
    expect(parseCdmImportError('CDM_IMPORT_UPLOAD_MISSING')).toEqual({
      code: 'CDM_IMPORT_UPLOAD_MISSING',
      detail: '',
    });
  });

  it.each([
    ['nothing', null],
    ['an empty message', ''],
    ['a message without a code', 'Import failed: deadlock detected'],
    ['a code this client does not know', 'CDM_IMPORT_FROM_THE_FUTURE: x'],
    ['a code that is not at the start', 'Failed. CDM_IMPORT_TOO_MANY_ENTITIES: x'],
  ])('returns null for %s', (_label, message) => {
    expect(parseCdmImportError(message)).toBeNull();
  });
});

describe('isByReferencePayload', () => {
  it('recognises the stub the API answers for a by-reference job', () => {
    expect(isByReferencePayload({ byReference: true, sizeBytes: 12 })).toBe(true);
  });

  it('does not mistake a CDM document for it', () => {
    expect(isByReferencePayload({ version: 1, mode: { strategy: 'merge' } })).toBe(false);
    expect(isByReferencePayload({ byReference: true })).toBe(false);
    expect(isByReferencePayload(null)).toBe(false);
  });
});

describe('formatMebibytes', () => {
  it('rounds to two decimals and drops trailing zeros', () => {
    expect(formatMebibytes(5 * 1024 * 1024)).toBe('5');
    expect(formatMebibytes(1.5 * 1024 * 1024)).toBe('1.5');
    expect(formatMebibytes(64 * 1024 * 1024)).toBe('64');
  });

  it('does not show a small file as 0', () => {
    expect(formatMebibytes(3 * 1024)).toBe('<0.01');
  });
});

describe('readPayloadTooLarge', () => {
  const refusal = (extensions: Record<string, unknown>) => ({ errors: [{ extensions }] });

  it('reads the domain code and the limit off an Apollo error', () => {
    expect(
      readPayloadTooLarge(refusal({ code: 'PAYLOAD_TOO_LARGE', limitBytes: 67108864 }))
    ).toEqual({ limitBytes: 67108864 });
  });

  it('reports the refusal without a limit when the server did not name one', () => {
    expect(readPayloadTooLarge(refusal({ code: 'PAYLOAD_TOO_LARGE' }))).toEqual({});
  });

  it('is undefined for any other failure', () => {
    expect(readPayloadTooLarge(refusal({ code: 'FORBIDDEN' }))).toBeUndefined();
    expect(readPayloadTooLarge(new Error('boom'))).toBeUndefined();
    expect(readPayloadTooLarge(undefined)).toBeUndefined();
  });
});

describe('the browser parse threshold', () => {
  it('is below the server upload ceiling, so there is always a range that is sent unparsed', () => {
    expect(CDM_BROWSER_PARSE_MAX_BYTES).toBeLessThan(64 * 1024 * 1024);
  });
});
