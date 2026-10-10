import type { Command } from 'commander';

import { authenticatedRequest } from '../api/authenticated.js';
import { handleCliError } from '../api/errors.js';
import { parseOutputFormat, printOutput } from '../config/output.js';
import { applyPathParams, flagName, mapOperations } from '../spec/map-commands.js';
import { vendoredOperations } from '../spec/operations.js';
import type { CliOperation, MappedCommand } from '../spec/types.js';

const SKIP_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/cli-callback',
  '/api/auth/github',
]);

interface SpecCommandOptions {
  profile?: string;
  output?: string;
  scopeId?: string;
  tenant?: string;
  query?: string[];
  body?: string;
  [key: string]: string | string[] | boolean | undefined;
}

function parseQuery(pairs: string[] | undefined): Record<string, string> {
  const query: Record<string, string> = {};
  for (const pair of pairs ?? []) {
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    query[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return query;
}

function addOperationCommand(group: Command, operation: CliOperation, verb: string): void {
  const cmd = group
    .command(verb)
    .description(operation.summary || `${operation.method.toUpperCase()} ${operation.path}`)
    .option('-p, --profile <name>', 'Profile to use (or GRANT_PROFILE)')
    .option('--output <format>', 'json or text')
    .option('--scope-id <id>', 'Override selected scope id')
    .option('--tenant <tenant>', 'Override selected scope tenant')
    .option('-q, --query <pair...>', 'Extra query pairs (key=value)')
    .option('--body <json>', 'JSON body');

  for (const param of operation.pathParams) {
    cmd.requiredOption(`--${flagName(param)} <value>`, `Path parameter ${param}`);
  }

  cmd.action(async (options: SpecCommandOptions) => {
    try {
      const params: Record<string, string> = {};
      for (const param of operation.pathParams) {
        const value = options[param] ?? options[flagName(param)];
        if (typeof value === 'string') params[param] = value;
      }
      const path = applyPathParams(operation.path, params);
      const format = parseOutputFormat(options.output);
      const body = options.body ? (JSON.parse(options.body) as unknown) : undefined;
      const { data } = await authenticatedRequest({
        flags: {
          profile: options.profile,
          scopeId: options.scopeId,
          tenant: options.tenant,
        },
        method: operation.method,
        path,
        query: parseQuery(options.query),
        body,
      });
      printOutput(data, format);
    } catch (err) {
      handleCliError(err);
    }
  });
}

export function createSpecCommands(program: Command): void {
  const mapped = mapOperations(
    vendoredOperations.filter((operation) => !SKIP_PATHS.has(operation.path))
  );
  const groups = new Map<string, MappedCommand[]>();

  for (const item of mapped) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }

  for (const [name, items] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (program.commands.some((existing) => existing.name() === name)) {
      continue;
    }
    const group = program.command(name).description(`REST ${name} operations`);
    const verbs = new Set<string>();
    for (const item of items) {
      if (
        verbs.has(item.verb) ||
        group.commands.some((existing) => existing.name() === item.verb)
      ) {
        continue;
      }
      verbs.add(item.verb);
      addOperationCommand(group, item.operation, item.verb);
    }
  }
}
