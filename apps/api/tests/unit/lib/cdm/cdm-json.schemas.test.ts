import { describe, expect, it } from 'vitest';

import { config } from '@/config';
import { validateCdmJsonFields } from '@/lib/cdm';
import { ValidationError } from '@/lib/errors';

/**
 * The gap these cover: GraphQL's `JSON` scalar asserts nothing, while the CDM
 * entity handlers read `condition`/`metadata` back through
 * `as Record<string, unknown>`. Every case below passes GraphQL today.
 */
describe('validateCdmJsonFields', () => {
  it('accepts a document with no JSON fields set', () => {
    expect(() =>
      validateCdmJsonFields({
        permissions: [{ key: 'p1', resource: 'r', action: 'read', name: 'Read' }],
        resources: [{ key: 'r', slug: 'doc', name: 'Doc', actions: ['read'] }],
      })
    ).not.toThrow();
  });

  it('accepts an empty document', () => {
    expect(() => validateCdmJsonFields({})).not.toThrow();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('accepts %s for an optional JSON object', (_label, value) => {
    expect(() => validateCdmJsonFields({ tags: [{ key: 't', metadata: value }] })).not.toThrow();
  });

  it('accepts a plain object', () => {
    expect(() =>
      validateCdmJsonFields({ tags: [{ key: 't', metadata: { owner: 'team-a' } }] })
    ).not.toThrow();
  });

  // The reason this slice exists: each of these satisfies `JSON` and then gets
  // cast to Record<string, unknown> by the entity handlers.
  it.each([
    ['a number', 42],
    ['a string', 'not-an-object'],
    ['an array', [1, 2, 3]],
    ['a boolean', true],
  ])('rejects %s where an object is read back', (_label, value) => {
    expect(() => validateCdmJsonFields({ permissions: [{ key: 'p', condition: value }] })).toThrow(
      ValidationError
    );
  });

  it('names the section, index, and field of each offending entry', () => {
    let message = '';
    try {
      validateCdmJsonFields({
        permissions: [
          { key: 'ok', condition: { a: 1 } },
          { key: 'bad', condition: 7 },
        ],
      });
    } catch (error) {
      message = (error as ValidationError).message;
    }

    expect(message).toContain('permissions[1].condition');
    expect(message).not.toContain('permissions[0]');
  });

  it('reports every offending entry, not just the first', () => {
    let message = '';
    try {
      validateCdmJsonFields({
        tags: [{ metadata: 1 }, { metadata: 2 }],
        permissions: [{ condition: 'x' }],
      });
    } catch (error) {
      message = (error as ValidationError).message;
    }

    expect(message).toContain('tags[0].metadata');
    expect(message).toContain('tags[1].metadata');
    expect(message).toContain('permissions[0].condition');
  });

  it('rejects JSON nested past the depth limit', () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < config.cdm.maxJsonDepth + 2; i += 1) {
      deep = { nested: deep };
    }

    expect(() => validateCdmJsonFields({ tags: [{ metadata: deep }] })).toThrow(/nest deeper/);
  });

  it('accepts JSON nested just inside the depth limit', () => {
    let shallow: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < config.cdm.maxJsonDepth - 2; i += 1) {
      shallow = { nested: shallow };
    }

    expect(() => validateCdmJsonFields({ tags: [{ metadata: shallow }] })).not.toThrow();
  });

  it('rejects JSON larger than the byte limit', () => {
    const oversized = { blob: 'x'.repeat(config.cdm.maxJsonBytes + 1) };

    expect(() => validateCdmJsonFields({ tags: [{ metadata: oversized }] })).toThrow(
      /serialize to at most/
    );
  });

  // `searchable` is the one JSON scalar the code does not read as an object.
  it('accepts both an array and an object for searchable', () => {
    expect(() =>
      validateCdmJsonFields({
        groups: [{ searchable: ['alice@example.com', 'legacy-42'] }],
        roleTemplates: [{ searchable: { tokens: ['x'] } }],
      })
    ).not.toThrow();
  });

  it('still rejects a scalar for searchable', () => {
    expect(() => validateCdmJsonFields({ groups: [{ searchable: 5 }] })).toThrow(ValidationError);
  });

  it('checks every section that carries a JSON scalar', () => {
    const sections = [
      'resources',
      'permissions',
      'tags',
      'groups',
      'roleTemplates',
      'provisionedUsers',
      'projectUserApiKeys',
    ] as const;

    for (const section of sections) {
      expect(() => validateCdmJsonFields({ [section]: [{ metadata: 'bad' }] })).toThrow(
        ValidationError
      );
    }
  });
});
