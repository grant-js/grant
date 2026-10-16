import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PROJECT_OAUTH_PROVIDER_OPTIONS } from '@/components/features/project-apps/project-app-types';

type Json = { [key: string]: Json | string };

const load = (locale: string): Json =>
  JSON.parse(readFileSync(join(process.cwd(), 'i18n/locales', `${locale}.json`), 'utf8'));

const en = load('en');
const de = load('de');

function at(tree: Json, path: string): Json | string | undefined {
  return path
    .split('.')
    .reduce<Json | string | undefined>(
      (node, key) => (node && typeof node === 'object' ? node[key] : undefined),
      tree
    );
}

function leafKeys(node: Json | string | undefined, prefix = ''): string[] {
  if (node === undefined) return [];
  if (typeof node === 'string') return [prefix];
  return Object.entries(node).flatMap(([key, value]) =>
    leafKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

describe('project-app password provider i18n (en and de)', () => {
  it('has the same keys in both locales for the hosted password view', () => {
    const enKeys = leafKeys(at(en, 'auth.projectOAuth.password'));
    expect(enKeys.length).toBeGreaterThan(10);
    expect(leafKeys(at(de, 'auth.projectOAuth.password')).sort()).toEqual(enKeys.sort());
  });

  it.each([
    'auth.projectOAuth.entry.password',
    'auth.projectOAuth.consent.providers.password',
    'projectApps.providers.password',
    'auth.projectOAuth.password.forgotPassword',
    'auth.projectOAuth.password.title',
    'auth.projectOAuth.password.submit',
    'auth.projectOAuth.password.invalidCredentials',
    'auth.projectOAuth.password.mfa.title',
  ])('has a non-empty %s in en and de', (path) => {
    for (const tree of [en, de]) {
      const value = at(tree, path);
      expect(typeof value).toBe('string');
      expect((value as string).trim()).not.toBe('');
    }
  });

  it('translates the German view rather than copying the English', () => {
    expect(at(de, 'auth.projectOAuth.password.title')).not.toBe(
      at(en, 'auth.projectOAuth.password.title')
    );
    expect(at(de, 'auth.projectOAuth.password.forgotPassword')).toBe('Passwort vergessen?');
  });

  it('gives the dashboard provider list a Password entry with a translation in both locales', () => {
    const option = PROJECT_OAUTH_PROVIDER_OPTIONS.find((o) => o.id === 'password');
    expect(option).toBeDefined();
    const key = `projectApps.${option!.nameKey}`;
    expect(at(en, key)).toBe('Password');
    expect(at(de, key)).toBe('Passwort');
  });
});
