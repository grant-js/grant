import { describe, expect, it } from 'vitest';

import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';

const locales = { en, de } as const;

/** Every dotted key path under an object, for comparing two message trees. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe.each(Object.entries(locales))('account-less messages (%s)', (_locale, messages) => {
  it('has the identity deletion wording for every key the deletion card and its toasts read', () => {
    const { accountDeletion, identityDeletion } = messages.settings.privacy;

    expect(keyPaths(identityDeletion).sort()).toEqual(keyPaths(accountDeletion).sort());
  });

  it('does not call the deleted thing an account', () => {
    const text = JSON.stringify(messages.settings.privacy.identityDeletion);

    expect(text).not.toMatch(/\b(account|Konto|Konten)\b/i);
  });

  it('has the no-workspace notice', () => {
    const { noWorkspace } = messages.settings.projectMemberships;

    expect(noWorkspace.title).toBeTruthy();
    expect(noWorkspace.description).toBeTruthy();
  });
});

describe('the notice for an account-less user (en)', () => {
  it('says there is no workspace and who can invite them', () => {
    expect(en.settings.projectMemberships.noWorkspace.description).toBe(
      "You don't have a workspace on this installation. An administrator can invite you to an organization."
    );
  });
});
