import type { CliOperation, MappedCommand } from './types.js';

function kebab(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function groupFromTag(tag: string | undefined, path: string): string {
  if (tag) return kebab(tag);
  const first = path
    .replace(/^\/api\/?/, '')
    .split('/')
    .find(Boolean);
  return first ? kebab(first) : 'api';
}

const SINGLETONS = new Set(['me', 'config', 'jwks']);

function deriveVerb(method: string, path: string): string {
  const parts = path
    .replace(/^\/api\/?/, '')
    .split('/')
    .filter(Boolean);
  const rest = parts.slice(1);
  const staticRest = rest.filter((part) => !part.startsWith('{'));
  const lastIsParam = (parts.at(-1) ?? '').startsWith('{');
  const verbLike = staticRest.at(-1);

  if (verbLike && /^(revoke|rotate|confirm|read|read-all)$/i.test(verbLike)) {
    return kebab(verbLike);
  }

  if (staticRest.length === 0) {
    if (method === 'get') {
      if (lastIsParam) return 'get';
      return SINGLETONS.has(parts[0] ?? '') ? 'get' : 'list';
    }
    if (method === 'post') return 'create';
    if (method === 'put' || method === 'patch') return 'update';
    if (method === 'delete') return 'delete';
    return method;
  }

  const action = staticRest.map(kebab).join('-');
  if (method === 'get') return lastIsParam ? `get-${action}` : `list-${action}`;
  if (method === 'post') return `create-${action}`;
  if (method === 'put' || method === 'patch') return `update-${action}`;
  if (method === 'delete') return `delete-${action}`;
  return `${method}-${action}`;
}

export function mapOperation(operation: CliOperation): MappedCommand {
  return {
    group: groupFromTag(operation.tags[0], operation.path),
    verb: deriveVerb(operation.method.toLowerCase(), operation.path),
    operation,
  };
}

export function mapOperations(operations: CliOperation[]): MappedCommand[] {
  const used = new Map<string, number>();
  return operations.map((operation) => {
    const mapped = mapOperation(operation);
    const key = `${mapped.group} ${mapped.verb}`;
    const count = used.get(key) ?? 0;
    used.set(key, count + 1);
    if (count > 0) {
      mapped.verb = `${mapped.verb}-${operation.operationId}`;
    }
    return mapped;
  });
}

export function pathParams(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1] ?? '').filter(Boolean);
}

export function applyPathParams(path: string, values: Record<string, string>): string {
  return path.replace(/\{([^}]+)\}/g, (_all, name: string) => {
    const value = values[name];
    if (!value) {
      throw new Error(`Missing path parameter --${kebab(name)}`);
    }
    return encodeURIComponent(value);
  });
}

export function flagName(param: string): string {
  return kebab(param);
}
