import type { Request } from 'express';
import {
  type DefinitionNode,
  type DocumentNode,
  type FragmentDefinitionNode,
  getOperationAST,
  Kind,
  parse,
  type SelectionNode,
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
