import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSchema,
  getNamedType,
  type GraphQLNamedType,
  type GraphQLSchema,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isUnionType,
} from 'graphql';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function graphqlFilesUnder(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return graphqlFilesUnder(path);
      return path.endsWith('.graphql') ? [path] : [];
    })
    .sort();
}

export const sdlFiles = (): string[] => graphqlFilesUnder(join(packageRoot, 'src', 'schema'));
export const operationFiles = (): string[] =>
  graphqlFilesUnder(join(packageRoot, 'src', 'operations'));

export const readAll = (files: string[]): string =>
  files.map((f) => readFileSync(f, 'utf8')).join('\n');

/**
 * Builds the merged schema from every file under `src/schema`, which is the same
 * set `apps/api` feeds to `makeExecutableSchema` via `loadFilesSync` — see
 * apps/api/src/graphql/resolvers/index.ts. Concatenation is equivalent here because
 * the schema is one directory of SDL with no imports between files.
 */
export function buildMergedSchema(): GraphQLSchema {
  return buildSchema(readAll(sdlFiles()));
}

/** Named types excluding GraphQL's introspection meta-types. */
export function declaredTypes(schema: GraphQLSchema): GraphQLNamedType[] {
  return Object.values(schema.getTypeMap()).filter((t) => !t.name.startsWith('__'));
}

/**
 * Types reachable by traversing fields, arguments, interfaces, and union members
 * from `Query` and `Mutation`. Anything outside this set is in the served schema
 * and visible to introspection, but no operation can reach it.
 */
export function reachableTypeNames(schema: GraphQLSchema): Set<string> {
  const seen = new Set<string>();

  const visit = (type: unknown): void => {
    const named = getNamedType(type as never) as GraphQLNamedType | undefined;
    if (!named || seen.has(named.name) || named.name.startsWith('__')) return;
    seen.add(named.name);

    if (isObjectType(named) || isInterfaceType(named)) {
      for (const field of Object.values(named.getFields())) {
        visit(field.type);
        for (const arg of field.args) visit(arg.type);
      }
      for (const iface of named.getInterfaces()) visit(iface);
    } else if (isInputObjectType(named)) {
      for (const field of Object.values(named.getFields())) visit(field.type);
    } else if (isUnionType(named)) {
      for (const member of named.getTypes()) visit(member);
    }
  };

  visit(schema.getQueryType());
  visit(schema.getMutationType());
  return seen;
}
