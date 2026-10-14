import { describe, expect, it } from 'vitest';

import {
  baseMediaType,
  CDM_IMPORT_KEY_PREFIX,
  cdmImportObjectKey,
  isCdmImportKey,
  normalizeUploadId,
} from '@/lib/cdm/cdm-import-upload.lib';
import { ValidationError } from '@/lib/errors';

const projectId = '00000000-0000-4000-8000-000000000011';
const uploadId = '123e4567-e89b-42d3-a456-426614174077';

describe('cdmImportObjectKey', () => {
  it('puts imports/ first, so one lifecycle rule can address the whole prefix', () => {
    const key = cdmImportObjectKey(projectId, uploadId);

    expect(key).toBe(`imports/projects/${projectId}/${uploadId}.json`);
    expect(key.startsWith(CDM_IMPORT_KEY_PREFIX)).toBe(true);
  });

  it('canonicalizes the id, so two spellings are one upload', () => {
    expect(cdmImportObjectKey(projectId, uploadId.toUpperCase())).toBe(
      cdmImportObjectKey(projectId, uploadId)
    );
  });

  it.each([
    '../users/1/avatar.png',
    'abc',
    `${uploadId}/../../x`,
    `${uploadId}.json`,
    '',
    '123e4567-e89b-42d3-a456-42661417407', // one character short
  ])('refuses an upload id a client could use to steer the key: %j', (hostile) => {
    expect(() => cdmImportObjectKey(projectId, hostile)).toThrow(ValidationError);
    expect(() => normalizeUploadId(hostile)).toThrow(ValidationError);
  });

  it('refuses a project id that is not a uuid', () => {
    expect(() => cdmImportObjectKey('../other', uploadId)).toThrow(ValidationError);
  });
});

describe('isCdmImportKey', () => {
  it('recognizes an import key whatever its case', () => {
    expect(isCdmImportKey(cdmImportObjectKey(projectId, uploadId))).toBe(true);
    expect(isCdmImportKey('IMPORTS/projects/x/y.json')).toBe(true);
  });

  it('does not recognize anything else, including look-alikes', () => {
    expect(isCdmImportKey('projects/p/picture.png')).toBe(false);
    expect(isCdmImportKey('imports-archive/x.json')).toBe(false);
    expect(isCdmImportKey('users/imports/x.json')).toBe(false);
  });
});

describe('baseMediaType', () => {
  it('drops parameters and case', () => {
    expect(baseMediaType('Application/JSON; charset=utf-8')).toBe('application/json');
    expect(baseMediaType('application/json')).toBe('application/json');
    expect(baseMediaType('')).toBe('');
  });
});
