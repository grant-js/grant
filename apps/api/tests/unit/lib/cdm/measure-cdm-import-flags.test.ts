import { CdmFindBy, CdmModeStrategy } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';

import {
  inputForPass,
  measurePasses,
  parseMeasureArgs,
  withReplaceStrategy,
} from '../../../helpers/measure-cdm-import';

const document: CdmDocumentInput = {
  version: 1,
  mode: { strategy: CdmModeStrategy.Merge, onConflict: null, confirmDestructive: false },
  roles: [],
  users: [{ key: { value: 'u1', findBy: CdmFindBy.Key }, name: 'Ada' }],
};

describe('measure-cdm-import flags', () => {
  it('keeps --repeat as merge and treats --replace as a later pass', () => {
    expect(parseMeasureArgs(['--repeat', 'key-fanout'])).toEqual({
      requested: ['key-fanout'],
      withRepeat: true,
      withReplace: false,
      withHashPrepSerial: false,
    });
    expect(parseMeasureArgs(['--replace', 'key-fanout'])).toEqual({
      requested: ['key-fanout'],
      withRepeat: false,
      withReplace: true,
      withHashPrepSerial: true,
    });
    expect(measurePasses({ withRepeat: true, withReplace: true })).toEqual([
      'first',
      'repeat',
      'replace',
    ]);
  });

  it('sets replace + confirmDestructive without mutating the merge document', () => {
    const replaced = withReplaceStrategy(document);
    expect(document.mode?.strategy).toBe(CdmModeStrategy.Merge);
    expect(replaced.mode?.strategy).toBe(CdmModeStrategy.Replace);
    expect(replaced.mode?.confirmDestructive).toBe(true);
    expect(inputForPass(document, 'first').mode?.strategy).toBe(CdmModeStrategy.Merge);
    expect(inputForPass(document, 'replace').mode?.strategy).toBe(CdmModeStrategy.Replace);
  });
});
