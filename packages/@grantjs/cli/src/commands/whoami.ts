import type { Command } from 'commander';

import { authenticatedRequest } from '../api/authenticated.js';
import { handleCliError } from '../api/errors.js';
import { resolveRuntimeContext } from '../config/credentials.js';
import { parseOutputFormat, printOutput } from '../config/output.js';

export function createWhoamiCommand(program: Command): void {
  program
    .command('whoami')
    .description('Show the authenticated caller (GET /api/me)')
    .option('-p, --profile <name>', 'Profile to use (or GRANT_PROFILE)')
    .option('--output <format>', 'json or text')
    .option('--scope-id <id>', 'Override selected scope id')
    .option('--tenant <tenant>', 'Override selected scope tenant')
    .action(
      async (options: {
        profile?: string;
        output?: string;
        scopeId?: string;
        tenant?: string;
      }) => {
        try {
          const format = parseOutputFormat(options.output);
          const ctx = await resolveRuntimeContext({
            profile: options.profile,
            scopeId: options.scopeId,
            tenant: options.tenant,
          });
          const { data } = await authenticatedRequest<Record<string, unknown>>({
            flags: options,
            method: 'GET',
            path: '/api/me',
            injectScope: false,
          });
          printOutput(
            {
              profile: ctx.profileName,
              apiUrl: ctx.apiUrl,
              authMethod: ctx.authMethod,
              scope: ctx.scope ?? null,
              me: data,
            },
            format
          );
        } catch (err) {
          handleCliError(err);
        }
      }
    );
}
