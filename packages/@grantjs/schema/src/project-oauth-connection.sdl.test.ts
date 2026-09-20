import { parse, validate } from 'graphql';
import { describe, expect, it } from 'vitest';

import { buildMergedSchema, operationFiles, readAll } from './test-support/sdl-fixture';

const SECRET_FIELD = /secret|encrypted|ciphertext|^iv$/i;

describe('ProjectOAuthConnection public types', () => {
  const schema = buildMergedSchema();

  it('does not expose secrets on the connection output type', () => {
    const connection = schema.getType('ProjectOAuthConnection');
    expect(connection).toBeDefined();
    expect(connection?.astNode?.kind).toBe('ObjectTypeDefinition');
    const fields =
      connection && 'getFields' in connection ? Object.keys(connection.getFields()) : [];

    expect(fields).toEqual(
      expect.arrayContaining([
        'id',
        'projectId',
        'provider',
        'clientId',
        'isConfigured',
        'createdAt',
        'updatedAt',
      ])
    );
    expect(fields.filter((name) => SECRET_FIELD.test(name))).toEqual([]);
  });

  it('accepts the client secret only as a write-only upsert input', () => {
    const input = schema.getType('UpsertProjectOAuthConnectionInput');
    expect(input).toBeDefined();
    const fields = input && 'getFields' in input ? Object.keys(input.getFields()) : [];

    expect(fields).toEqual(
      expect.arrayContaining(['scope', 'provider', 'clientId', 'clientSecret'])
    );
    expect(schema.getType('ClearProjectOAuthConnectionInput')).toBeDefined();
    expect(schema.getQueryType()?.getFields().projectOAuthConnections).toBeDefined();
    expect(schema.getMutationType()?.getFields().upsertProjectOAuthConnection).toBeDefined();
    expect(schema.getMutationType()?.getFields().clearProjectOAuthConnection).toBeDefined();
  });

  it('keeps operation documents from selecting secret fields', () => {
    const files = operationFiles().filter((file) => file.includes('project-oauth-connections'));
    expect(files.length).toBe(3);

    for (const file of files) {
      const errors = validate(schema, parse(readAll([file])));
      expect(errors.map((e) => e.message)).toEqual([]);
    }

    const documents = readAll(files);
    expect(documents).not.toMatch(/\bclientSecret\b/);
    expect(documents).not.toMatch(/\bencryptedSecret\b/);
    expect(documents).not.toMatch(/\bsecretIv\b/);
    expect(documents).not.toMatch(/\bsecretTag\b/);
  });
});
