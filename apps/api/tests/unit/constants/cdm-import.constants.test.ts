import { describe, expect, it } from 'vitest';

import { buildCdmImportMetadata, CDM_IMPORT_METADATA_KEY } from '@/constants/cdm-import.constants';

describe('cdmImport metadata', () => {
  it('builds role payload with externalKey', () => {
    expect(buildCdmImportMetadata('proj-1', 'role', 'admin')).toEqual({
      [CDM_IMPORT_METADATA_KEY]: {
        projectId: 'proj-1',
        kind: 'role',
        externalKey: 'admin',
      },
    });
  });

  it('builds group payload without externalKey', () => {
    expect(buildCdmImportMetadata('proj-1', 'group')).toEqual({
      [CDM_IMPORT_METADATA_KEY]: {
        projectId: 'proj-1',
        kind: 'group',
      },
    });
  });
});
