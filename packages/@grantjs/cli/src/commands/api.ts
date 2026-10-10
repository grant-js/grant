import { readFileSync } from 'node:fs';

import type { Command } from 'commander';

import { authenticatedRequest } from '../api/authenticated.js';
import { handleCliError } from '../api/errors.js';
import { parseOutputFormat, printOutput } from '../config/output.js';

function parseQuery(pairs: string[] | undefined): Record<string, string> {
  const query: Record<string, string> = {};
  for (const pair of pairs ?? []) {
    const eq = pair.indexOf('=');
    if (eq <= 0) {
      throw new Error(`Invalid --query "${pair}". Use key=value.`);
    }
    query[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return query;
}

function parseBody(options: { body?: string; bodyFile?: string }): unknown {
  const raw = options.bodyFile ? readFileSync(options.bodyFile, 'utf-8') : options.body;
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed === '-') {
    const stdin = readFileSync(0, 'utf-8');
    return stdin.trim() ? JSON.parse(stdin) : undefined;
  }
  return JSON.parse(trimmed);
}

export function createApiCommand(program: Command): void {
  program
    .command('api')
    .description('Call any Grant REST path with the resolved profile (method + path)')
    .argument('<method>', 'HTTP method (GET, POST, PATCH, PUT, DELETE)')
    .argument('<path>', 'Path beginning with /api/…')
    .option('-p, --profile <name>', 'Profile to use (or GRANT_PROFILE)')
    .option('--output <format>', 'json or text')
    .option('--scope-id <id>', 'Override selected scope id')
    .option('--tenant <tenant>', 'Override selected scope tenant')
    .option('-q, --query <pair...>', 'Query pairs (key=value). Repeatable')
    .option('--body <json>', 'JSON body (use - to read stdin)')
    .option('--body-file <path>', 'Read JSON body from a file')
    .option('--no-scope', 'Do not inject profile scopeId/tenant query params')
    .action(
      async (
        method: string,
        path: string,
        options: {
          profile?: string;
          output?: string;
          scopeId?: string;
          tenant?: string;
          query?: string[];
          body?: string;
          bodyFile?: string;
          scope?: boolean;
        }
      ) => {
        try {
          if (!path.startsWith('/')) {
            path = `/${path}`;
          }
          const format = parseOutputFormat(options.output);
          const { data } = await authenticatedRequest({
            flags: {
              profile: options.profile,
              scopeId: options.scopeId,
              tenant: options.tenant,
            },
            method,
            path,
            query: parseQuery(options.query),
            body: parseBody(options),
            injectScope: options.scope !== false,
          });
          printOutput(data, format);
        } catch (err) {
          handleCliError(err);
        }
      }
    );
}
