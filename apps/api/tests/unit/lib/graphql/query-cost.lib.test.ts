import {
  buildSchema,
  type DocumentNode,
  type FragmentDefinitionNode,
  Kind,
  parse,
  specifiedRules,
  validate,
} from 'graphql';
import { describe, expect, it } from 'vitest';

import {
  computeSelectionComplexity,
  computeSelectionDepth,
  createGraphqlCostValidationRules,
  type GraphqlCostLimits,
} from '@/lib/graphql/query-cost.lib';

const limits: GraphqlCostLimits = {
  maxDepth: 4,
  maxComplexity: 50,
  defaultPageSize: 50,
  maxPageSize: 100,
};

function fragmentsOf(doc: DocumentNode): Map<string, FragmentDefinitionNode> {
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const def of doc.definitions) {
    if (def.kind === Kind.FRAGMENT_DEFINITION) {
      fragments.set(def.name.value, def);
    }
  }
  return fragments;
}

function operationSelections(query: string) {
  const doc = parse(query);
  const operation = doc.definitions.find((def) => def.kind === Kind.OPERATION_DEFINITION);
  if (!operation || operation.kind !== Kind.OPERATION_DEFINITION) {
    throw new Error('expected an operation');
  }
  return { selections: operation.selectionSet.selections, fragments: fragmentsOf(doc) };
}

const schema = buildSchema(/* GraphQL */ `
  type Tag {
    name: String
  }
  type User {
    id: ID
    name: String
    tags: [Tag]
  }
  type Query {
    users(limit: Int): [User]
    me: User
  }
`);

describe('GraphQL query cost', () => {
  it('counts depth through nested selections and fragments', () => {
    const nested = operationSelections('{ users { tags { name } } }');
    expect(computeSelectionDepth(nested.selections, nested.fragments)).toBe(3);

    const withFragment = operationSelections(`
      query {
        users {
          ...UserFields
        }
      }
      fragment UserFields on User {
        tags { name }
      }
    `);
    expect(computeSelectionDepth(withFragment.selections, withFragment.fragments)).toBe(3);
  });

  it('does not count introspection trees toward depth', () => {
    const intro = operationSelections('{ __schema { types { name } } me { name } }');
    expect(computeSelectionDepth(intro.selections, intro.fragments)).toBe(2);
  });

  it('multiplies child cost by a list limit and caps -1 at maxPageSize', () => {
    const limited = operationSelections('{ users(limit: 10) { id name } }');
    expect(computeSelectionComplexity(limited.selections, limited.fragments, limits)).toBe(21);

    const uncapped = operationSelections('{ users(limit: -1) { id } }');
    expect(computeSelectionComplexity(uncapped.selections, uncapped.fragments, limits)).toBe(101);
  });

  it('does not multiply nested fields that have no limit argument', () => {
    const me = operationSelections('{ me { tags { name } } }');
    expect(computeSelectionComplexity(me.selections, me.fragments, limits)).toBe(3);
  });

  it('rejects documents that exceed depth or complexity via validation rules', () => {
    const rules = [...specifiedRules, ...createGraphqlCostValidationRules(limits)];
    expect(validate(schema, parse('{ me { tags { name } } }'), rules)).toEqual([]);

    const tooDeep = validate(schema, parse('{ me { tags { name } } }'), [
      ...specifiedRules,
      ...createGraphqlCostValidationRules({ ...limits, maxDepth: 2 }),
    ]);
    expect(tooDeep.some((err) => /depth/i.test(err.message))).toBe(true);

    const tooComplex = validate(
      schema,
      parse('{ users(limit: 100) { id name tags { name } } }'),
      rules
    );
    expect(tooComplex.some((err) => /complexity/i.test(err.message))).toBe(true);
  });
});
