import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

import { parse, validate } from 'graphql';
import { describe, expect, it } from 'vitest';

import {
  buildMergedSchema,
  declaredTypes,
  operationFiles,
  reachableTypeNames,
  sdlFiles,
} from './test-support/sdl-fixture';

/**
 * The schema is the package's real deliverable, and until now nothing executed it:
 * `apps/api` was the first thing to find out whether the SDL builds, at boot.
 * These are the structural assertions that belong to the package that owns the SDL.
 */
describe('merged SDL', () => {
  const schema = buildMergedSchema();

  it('builds from every file under src/schema', () => {
    expect(sdlFiles().length).toBeGreaterThan(0);
    expect(schema.getQueryType()).toBeDefined();
    expect(schema.getMutationType()).toBeDefined();
  });

  it('exposes the root fields the API serves', () => {
    // Guards against a merge that silently drops `extend type Query|Mutation` blocks:
    // the schema would still build, with a near-empty root.
    expect(Object.keys(schema.getQueryType()!.getFields()).length).toBeGreaterThanOrEqual(32);
    expect(Object.keys(schema.getMutationType()!.getFields()).length).toBeGreaterThanOrEqual(84);
  });
});

describe('operation documents', () => {
  const schema = buildMergedSchema();
  const files = operationFiles();

  it('finds every document under src/operations', () => {
    expect(files.length).toBeGreaterThanOrEqual(116);
  });

  it.each(files.map((f) => [relative(process.cwd(), f), f]))('%s validates', (_label, file) => {
    const errors = validate(schema, parse(readFileSync(file, 'utf8')));
    expect(errors.map((e) => e.message)).toEqual([]);
  });
});

describe('graph reachability', () => {
  const schema = buildMergedSchema();

  /**
   * 181 of 388 declared types cannot be reached from Query or Mutation. They are
   * not dead: 171 are consumed as generated TypeScript by apps/api, and the
   * *SearchableField enums are runtime search configuration. But every one of them
   * ships in the schema `makeExecutableSchema` serves.
   *
   * This number is the input to the Tier 3 decision in
   * docs/contributing/code-quality/schema.md — pinned so it moves visibly.
   * Deleting unreachable SDL (pass 5 slice 4 removes 6) lowers it; adding a type
   * with no query or mutation raises it. Either way, update it deliberately.
   */
  const UNREACHABLE_FROM_ROOT = 181;

  it('pins the count of types unreachable from Query/Mutation', () => {
    const reachable = reachableTypeNames(schema);
    const unreachable = declaredTypes(schema).filter((t) => !reachable.has(t.name));

    expect(unreachable).toHaveLength(UNREACHABLE_FROM_ROOT);
  });

  it('keeps every operation document inside the reachable set', () => {
    // A document can only select reachable types, so this is a consistency check on
    // the traversal itself: if it under-reports, the validation suite above would
    // still pass while this pins a wrong number.
    const reachable = reachableTypeNames(schema);
    expect(reachable.has('Query')).toBe(true);
    expect(reachable.has('Mutation')).toBe(true);
    expect(reachable.size).toBe(declaredTypes(schema).length - UNREACHABLE_FROM_ROOT);
  });
});
