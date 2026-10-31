import { describe, expect, it } from 'vitest';

import { type KeyTranslator, translatePermissionField } from '@/lib/translate-or-raw';

function translator(messages: Record<string, string>): KeyTranslator {
  const t = ((key: string) => messages[key] ?? key) as KeyTranslator;
  t.has = (key: string) => key in messages;
  return t;
}

const apiKeyCreate = {
  name: 'permissions.names.ApiKey.Create',
  description: 'permissions.descriptions.ApiKey.Create',
  action: 'Create',
  resource: { slug: 'ApiKey' },
};

describe('translatePermissionField', () => {
  it('uses the key the API sent when the catalogue has it', () => {
    const t = translator({ 'permissions.names.ApiKey.Create': 'Sent' });

    expect(translatePermissionField(t, apiKeyCreate, 'name')).toBe('Sent');
  });

  it('falls back to the camel-cased catalogue key when the casing differs', () => {
    const t = translator({
      'permissions.names.apiKey.create': 'Create API Key',
      'permissions.descriptions.apiKey.create': 'Permission to create an API key',
    });

    expect(translatePermissionField(t, apiKeyCreate, 'name')).toBe('Create API Key');
    expect(translatePermissionField(t, apiKeyCreate, 'description')).toBe(
      'Permission to create an API key'
    );
  });

  it('camel-cases a multi-word action and a kebab-case slug', () => {
    const t = translator({ 'permissions.names.projectUser.exportCredentials': 'Export' });

    expect(
      translatePermissionField(
        t,
        { name: 'x', action: 'ExportCredentials', resource: { slug: 'ProjectUser' } },
        'name'
      )
    ).toBe('Export');
    expect(
      translatePermissionField(
        t,
        { name: 'x', action: 'export-credentials', resource: { slug: 'project-user' } },
        'name'
      )
    ).toBe('Export');
  });

  it('reads as Action Resource when no catalogue knows the key, and keeps plain text', () => {
    const t = translator({});

    expect(translatePermissionField(t, apiKeyCreate, 'name')).toBe('Create ApiKey');
    expect(translatePermissionField(t, { ...apiKeyCreate, name: 'Create keys' }, 'name')).toBe(
      'Create keys'
    );
    expect(translatePermissionField(t, { ...apiKeyCreate, description: null }, 'description')).toBe(
      ''
    );
  });
});
