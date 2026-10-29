import type { Request } from 'express';
import {
  type DefinitionNode,
  type DocumentNode,
  type FieldNode,
  type FragmentDefinitionNode,
  getOperationAST,
  Kind,
  type OperationDefinitionNode,
  parse,
  type SelectionNode,
  type ValueNode,
} from 'graphql';

/**
 * GraphQL mutation fields / operation names that share the auth-sensitive
 * rate-limit bucket with REST login/refresh. Exported for tests.
 */
export const AUTH_SENSITIVE_GRAPHQL_OPERATION_NAMES = [
  'login',
  'register',
  'refreshSession',
] as const;

const AUTH_SENSITIVE_GRAPHQL_NAME_SET = new Set<string>(AUTH_SENSITIVE_GRAPHQL_OPERATION_NAMES);

/** Apollo is mounted at `/graphql`; leftover path (`/graphql/foo`) is still GraphQL. */
export function isGraphqlHttpPath(path: string): boolean {
  return path === '/graphql' || path.startsWith('/graphql/');
}

type GraphqlRequestBody = {
  query?: unknown;
  operationName?: unknown;
};

function isFragmentDefinition(node: DefinitionNode): node is FragmentDefinitionNode {
  return node.kind === Kind.FRAGMENT_DEFINITION;
}

function collectFieldNames(
  selections: readonly SelectionNode[],
  fragments: Map<string, FragmentDefinitionNode>,
  out: Set<string>,
  visitedFragments: Set<string>
): void {
  for (const sel of selections) {
    if (sel.kind === Kind.FIELD) {
      out.add(sel.name.value);
      if (sel.selectionSet) {
        collectFieldNames(sel.selectionSet.selections, fragments, out, visitedFragments);
      }
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      collectFieldNames(sel.selectionSet.selections, fragments, out, visitedFragments);
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const fragmentName = sel.name.value;
      if (visitedFragments.has(fragmentName)) {
        continue;
      }
      const fragment = fragments.get(fragmentName);
      if (fragment) {
        visitedFragments.add(fragmentName);
        collectFieldNames(fragment.selectionSet.selections, fragments, out, visitedFragments);
      }
    }
  }
}

export function graphqlDocumentUsesAuthSensitiveOperation(
  query: string,
  operationName?: string | null
): boolean {
  let doc: DocumentNode;
  try {
    doc = parse(query);
  } catch {
    return false;
  }

  const selectedName =
    typeof operationName === 'string' && operationName.length > 0 ? operationName : undefined;
  if (selectedName && AUTH_SENSITIVE_GRAPHQL_NAME_SET.has(selectedName)) {
    return true;
  }

  const op = getOperationAST(doc, selectedName);
  if (!op || op.kind !== Kind.OPERATION_DEFINITION) {
    return false;
  }
  if (op.name?.value && AUTH_SENSITIVE_GRAPHQL_NAME_SET.has(op.name.value)) {
    return true;
  }

  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const def of doc.definitions) {
    if (isFragmentDefinition(def)) {
      fragments.set(def.name.value, def);
    }
  }

  const names = new Set<string>();
  collectFieldNames(op.selectionSet.selections, fragments, names, new Set());
  for (const name of names) {
    if (AUTH_SENSITIVE_GRAPHQL_NAME_SET.has(name)) {
      return true;
    }
  }
  return false;
}

function bodyUsesAuthSensitiveOperation(body: GraphqlRequestBody): boolean {
  const operationName =
    typeof body.operationName === 'string' && body.operationName.length > 0
      ? body.operationName
      : undefined;
  if (operationName && AUTH_SENSITIVE_GRAPHQL_NAME_SET.has(operationName)) {
    return true;
  }
  if (typeof body.query !== 'string' || body.query.length === 0) {
    return false;
  }
  return graphqlDocumentUsesAuthSensitiveOperation(body.query, operationName);
}

/**
 * True when this request is GraphQL `login` / `register` / `refreshSession`
 * (named operation, unnamed document, or those fields under another operation name).
 */
export function isAuthSensitiveGraphqlRequest(
  req: Pick<Request, 'method' | 'path' | 'body'>
): boolean {
  if (req.method !== 'POST' || !isGraphqlHttpPath(req.path)) {
    return false;
  }
  try {
    const raw = req.body;
    if (Array.isArray(raw)) {
      return raw.some(
        (item) => item && typeof item === 'object' && bodyUsesAuthSensitiveOperation(item)
      );
    }
    if (!raw || typeof raw !== 'object') {
      return false;
    }
    return bodyUsesAuthSensitiveOperation(raw as GraphqlRequestBody);
  } catch {
    // Classification blew up (should be rare after the fragment cycle guard).
    // Fail closed so this request still increments the auth bucket.
    return true;
  }
}

function collectRootFields(
  selections: readonly SelectionNode[],
  fragments: Map<string, FragmentDefinitionNode>,
  out: FieldNode[],
  visitedFragments: Set<string>
): void {
  for (const sel of selections) {
    if (sel.kind === Kind.FIELD) {
      out.push(sel);
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      collectRootFields(sel.selectionSet.selections, fragments, out, visitedFragments);
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const fragmentName = sel.name.value;
      if (visitedFragments.has(fragmentName)) {
        continue;
      }
      visitedFragments.add(fragmentName);
      const fragment = fragments.get(fragmentName);
      if (fragment) {
        collectRootFields(fragment.selectionSet.selections, fragments, out, visitedFragments);
      }
    }
  }
}

function asVariableRecord(variables: unknown): Record<string, unknown> | null {
  return variables && typeof variables === 'object' && !Array.isArray(variables)
    ? (variables as Record<string, unknown>)
    : null;
}

/**
 * Whether a GraphQL value, as the handler will see it, has a non-null `email`.
 * Anything this cannot prove absent counts as present: the caller is a limiter, so it
 * fails closed.
 */
function valueCarriesEmail(
  value: ValueNode,
  op: OperationDefinitionNode,
  variables: Record<string, unknown> | null
): boolean {
  if (value.kind === Kind.VARIABLE) {
    const supplied = variables?.[value.name.value];
    if (supplied && typeof supplied === 'object' && !Array.isArray(supplied)) {
      const email = (supplied as Record<string, unknown>).email;
      return email !== undefined && email !== null;
    }
    // A missing variable is only usable through its default; anything else is rejected
    // by validation before a resolver runs.
    const defaultValue = op.variableDefinitions?.find(
      (def) => def.variable.name.value === value.name.value
    )?.defaultValue;
    return defaultValue ? valueCarriesEmail(defaultValue, op, variables) : false;
  }
  if (value.kind !== Kind.OBJECT) {
    return true;
  }
  const emailField = value.fields.find((field) => field.name.value === 'email');
  if (!emailField || emailField.value.kind === Kind.NULL) {
    return false;
  }
  if (emailField.value.kind === Kind.VARIABLE) {
    const name = emailField.value.name.value;
    if (variables && Object.prototype.hasOwnProperty.call(variables, name)) {
      return variables[name] !== null && variables[name] !== undefined;
    }
    const defaultValue = op.variableDefinitions?.find(
      (def) => def.variable.name.value === name
    )?.defaultValue;
    return defaultValue !== undefined && defaultValue.kind !== Kind.NULL;
  }
  return true;
}

function countSetEmailInBody(
  body: GraphqlRequestBody & { variables?: unknown; extensions?: unknown }
) {
  if (typeof body.query !== 'string' || body.query.length === 0) {
    // A hash-only (persisted query) request cannot be classified, and the stored document
    // may be one that was registered once and never counted. Count it.
    const ext = body.extensions;
    const persisted =
      ext && typeof ext === 'object' && 'persistedQuery' in (ext as Record<string, unknown>);
    return persisted ? 1 : 0;
  }

  // Cheap prefilter: every authenticated GraphQL request passes through here, and a field
  // name cannot be spelled any other way in a document, so no parse is needed without it.
  if (!body.query.includes('setProjectUserEmail') && !body.query.includes('createUser')) {
    return 0;
  }

  let doc: DocumentNode;
  try {
    doc = parse(body.query);
  } catch {
    return 0;
  }
  const operationName =
    typeof body.operationName === 'string' && body.operationName.length > 0
      ? body.operationName
      : undefined;
  const op = getOperationAST(doc, operationName);
  if (!op || op.operation !== 'mutation') {
    return 0;
  }

  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const def of doc.definitions) {
    if (isFragmentDefinition(def)) {
      fragments.set(def.name.value, def);
    }
  }
  const roots: FieldNode[] = [];
  collectRootFields(op.selectionSet.selections, fragments, roots, new Set());

  const variables = asVariableRecord(body.variables);
  let count = 0;
  for (const field of roots) {
    if (field.name.value === 'setProjectUserEmail') {
      count += 1;
    } else if (field.name.value === 'createUser') {
      const input = field.arguments?.find((arg) => arg.name.value === 'input');
      if (!input || valueCarriesEmail(input.value, op, variables)) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * How many set-email operations this HTTP request runs: `setProjectUserEmail`, and
 * `createUser` with an `email`, read from the root fields of the selected operation
 * (named, unnamed, through fragments, with the input inline or in variables), plus
 * every item of a batched body. Fails closed: a classification error counts as one.
 */
export function countSetEmailGraphqlOperations(
  req: Pick<Request, 'method' | 'path' | 'body'>
): number {
  if (req.method !== 'POST' || !isGraphqlHttpPath(req.path.toLowerCase())) {
    return 0;
  }
  try {
    const raw = req.body;
    if (Array.isArray(raw)) {
      return raw.reduce(
        (sum: number, item: unknown) =>
          sum + (item && typeof item === 'object' ? countSetEmailInBody(item) : 0),
        0
      );
    }
    if (!raw || typeof raw !== 'object') {
      return 0;
    }
    return countSetEmailInBody(raw);
  } catch {
    return 1;
  }
}
