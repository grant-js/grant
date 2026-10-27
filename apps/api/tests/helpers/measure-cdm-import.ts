import { CdmModeStrategy } from '@grantjs/schema';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';

export type MeasurePass = 'first' | 'repeat' | 'replace';

export type MeasureFlags = {
  requested: string[];
  withRepeat: boolean;
  withReplace: boolean;
  withHashPrepSerial: boolean;
};

export function parseMeasureArgs(argv: readonly string[]): MeasureFlags {
  const withRepeat = argv.includes('--repeat');
  const withReplace = argv.includes('--replace');
  const requested = argv.filter((argument) => !argument.startsWith('--'));
  return {
    requested,
    withRepeat,
    withReplace,
    withHashPrepSerial: argv.includes('--hash-prep-serial') || withReplace,
  };
}

export function measurePasses(
  flags: Pick<MeasureFlags, 'withRepeat' | 'withReplace'>
): MeasurePass[] {
  const passes: MeasurePass[] = ['first'];
  if (flags.withRepeat) {
    passes.push('repeat');
  }
  if (flags.withReplace) {
    passes.push('replace');
  }
  return passes;
}

export function withReplaceStrategy(document: CdmDocumentInput): CdmDocumentInput {
  return {
    ...document,
    mode: {
      strategy: CdmModeStrategy.Replace,
      onConflict: document.mode?.onConflict ?? null,
      confirmDestructive: true,
    },
  };
}

export function inputForPass(document: CdmDocumentInput, pass: MeasurePass): CdmDocumentInput {
  return pass === 'replace' ? withReplaceStrategy(document) : document;
}
