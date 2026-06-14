import { describe, expect, it } from 'vitest';

import { isSyntheticCdmRoleKey, isSyntheticCdmRoleMetadata } from '@/lib/cdm/cdm-synthetic.lib';

describe('cdm-synthetic.lib', () => {
  it('detects legacy synthetic role keys', () => {
    expect(isSyntheticCdmRoleKey('synthetic:role:user:u1:direct')).toBe(true);
    expect(isSyntheticCdmRoleKey('viewer')).toBe(false);
    expect(isSyntheticCdmRoleKey('synthetic:role:user:u1:other')).toBe(false);
  });

  it('detects synthetic role metadata', () => {
    expect(
      isSyntheticCdmRoleMetadata({
        cdmImport: { externalKey: 'synthetic:role:user:u1:direct', kind: 'role', projectId: 'p' },
      })
    ).toBe(true);
    expect(isSyntheticCdmRoleMetadata({ synthetic: true })).toBe(true);
    expect(isSyntheticCdmRoleMetadata({ cdmImport: { externalKey: 'viewer', kind: 'role' } })).toBe(
      false
    );
  });
});
