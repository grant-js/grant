import {
  type FieldNode,
  type FragmentDefinitionNode,
  GraphQLError,
  Kind,
  type SelectionNode,
  type ValidationContext,
  type ValidationRule,
  type ValueNode,
} from 'graphql';

export type GraphqlCostLimits = {
  maxDepth: number;
  maxComplexity: number;
  defaultPageSize: number;
  maxPageSize: number;
};

function isCountedIntrospectionField(name: string): boolean {
  return name.startsWith('__') && name !== '__typename';
}

export function collectFragmentMap(
  context: ValidationContext
): Map<string, FragmentDefinitionNode> {
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const def of context.getDocument().definitions) {
    if (def.kind === Kind.FRAGMENT_DEFINITION) {
      fragments.set(def.name.value, def);
    }
  }
  return fragments;
}

function intFromValue(value: ValueNode | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  if (value.kind === Kind.INT) {
    const parsed = Number.parseInt(value.value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function fieldLimitMultiplier(field: FieldNode, limits: GraphqlCostLimits): number | undefined {
  const arg = field.arguments?.find((argument) => argument.name.value === 'limit');
  if (!arg) {
    return undefined;
  }
  const raw = intFromValue(arg.value, limits.defaultPageSize);
  if (raw === -1) {
    return limits.maxPageSize;
  }
  return Math.min(Math.max(raw, 1), limits.maxPageSize);
}

export function computeSelectionDepth(
  selections: readonly SelectionNode[],
  fragments: Map<string, FragmentDefinitionNode>,
  visited = new Set<string>()
): number {
  let max = 0;
  for (const sel of selections) {
    if (sel.kind === Kind.FIELD) {
      if (isCountedIntrospectionField(sel.name.value)) {
        continue;
      }
      const child = sel.selectionSet
        ? computeSelectionDepth(sel.selectionSet.selections, fragments, visited)
        : 0;
      max = Math.max(max, 1 + child);
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      max = Math.max(max, computeSelectionDepth(sel.selectionSet.selections, fragments, visited));
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const name = sel.name.value;
      if (visited.has(name)) {
        continue;
      }
      const fragment = fragments.get(name);
      if (!fragment) {
        continue;
      }
      visited.add(name);
      max = Math.max(
        max,
        computeSelectionDepth(fragment.selectionSet.selections, fragments, visited)
      );
      visited.delete(name);
    }
  }
  return max;
}

export function computeSelectionComplexity(
  selections: readonly SelectionNode[],
  fragments: Map<string, FragmentDefinitionNode>,
  limits: GraphqlCostLimits,
  multiplier = 1,
  visited = new Set<string>()
): number {
  let total = 0;
  for (const sel of selections) {
    if (sel.kind === Kind.FIELD) {
      if (isCountedIntrospectionField(sel.name.value)) {
        continue;
      }
      total += multiplier;
      if (sel.selectionSet) {
        const listMultiplier = fieldLimitMultiplier(sel, limits);
        const childMultiplier =
          listMultiplier === undefined ? multiplier : multiplier * listMultiplier;
        total += computeSelectionComplexity(
          sel.selectionSet.selections,
          fragments,
          limits,
          childMultiplier,
          visited
        );
      }
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      total += computeSelectionComplexity(
        sel.selectionSet.selections,
        fragments,
        limits,
        multiplier,
        visited
      );
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const name = sel.name.value;
      if (visited.has(name)) {
        continue;
      }
      const fragment = fragments.get(name);
      if (!fragment) {
        continue;
      }
      visited.add(name);
      total += computeSelectionComplexity(
        fragment.selectionSet.selections,
        fragments,
        limits,
        multiplier,
        visited
      );
      visited.delete(name);
    }
  }
  return total;
}

export function createMaxDepthRule(maxDepth: number): ValidationRule {
  return function MaxDepthRule(context) {
    const fragments = collectFragmentMap(context);
    return {
      OperationDefinition(operation) {
        const depth = computeSelectionDepth(operation.selectionSet.selections, fragments);
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(`Query depth ${depth} exceeds maximum of ${maxDepth}`, {
              nodes: operation,
            })
          );
        }
      },
    };
  };
}

export function createMaxComplexityRule(limits: GraphqlCostLimits): ValidationRule {
  return function MaxComplexityRule(context) {
    const fragments = collectFragmentMap(context);
    return {
      OperationDefinition(operation) {
        const complexity = computeSelectionComplexity(
          operation.selectionSet.selections,
          fragments,
          limits
        );
        if (complexity > limits.maxComplexity) {
          context.reportError(
            new GraphQLError(
              `Query complexity ${complexity} exceeds maximum of ${limits.maxComplexity}`,
              { nodes: operation }
            )
          );
        }
      },
    };
  };
}

export function createGraphqlCostValidationRules(limits: GraphqlCostLimits): ValidationRule[] {
  return [createMaxDepthRule(limits.maxDepth), createMaxComplexityRule(limits)];
}
