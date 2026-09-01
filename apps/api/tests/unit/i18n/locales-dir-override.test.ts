/**
 * `@grantjs/i18n` finds its locale JSON relative to its own compiled location. A
 * bundled build inlines it into a single output file, so that resolution points at
 * the bundle instead — the Lambda image passes `I18N_LOCALES_DIR` for exactly this.
 *
 * Tested from apps/api because it is the consumer that threads the override
 * through; `@grantjs/i18n` itself has no test runner.
 */
import { existsSync } from 'node:fs';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getLocalesPath, getMergedMessages } from '@grantjs/i18n/loader';
import { describe, expect, it } from 'vitest';

describe('locale directory resolution', () => {
  it('resolves next to the package when no override is given', () => {
    const path = getLocalesPath();

    expect(path.endsWith('locales')).toBe(true);
    expect(existsSync(join(path, 'en', 'errors.json'))).toBe(true);
  });

  it('falls back to package-relative resolution for an empty override', () => {
    // I18N_LOCALES_DIR defaults to '' — unset must not become a path.
    expect(getLocalesPath('')).toBe(getLocalesPath());
  });

  it('reads messages from an override directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'grant-locales-'));
    mkdirSync(join(root, 'en'), { recursive: true });
    for (const ns of ['errors', 'common', 'email']) {
      writeFileSync(join(root, 'en', `${ns}.json`), JSON.stringify({ marker: ns }));
    }

    expect(getLocalesPath(root)).toBe(root);
    expect(getMergedMessages('en', root)).toEqual({
      errors: { marker: 'errors' },
      common: { marker: 'common' },
      email: { marker: 'email' },
    });
  });
});
