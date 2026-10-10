import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Command } from 'commander';

import { fetchPermissions, fetchResources } from '../api/client.js';
import { handleCliError } from '../api/errors.js';
import { resolveRuntimeContext } from '../config/credentials.js';
import { resolveAccessToken } from '../config/resolve-token.js';
import { generateTypesContent } from './generate-types-impl.js';

const DEFAULT_OUTPUT = './grant-types.ts';

export function createGenerateTypesCommand(program: Command): void {
  program
    .command('generate-types')
    .description(
      "Query the selected project's resources and permissions, then generate ResourceSlug and ResourceAction TypeScript constants"
    )
    .option('-p, --profile <name>', 'Profile to use (default: default profile)')
    .option(
      '-o, --output <path>',
      'Output file path (default: from grant start, or ./grant-types.ts)'
    )
    .option('--dry-run', 'Print what would be generated without writing')
    .addHelpText(
      'after',
      '\nExample:\n  grant generate-types --profile staging -o ./src/grant-types.ts\n'
    )
    .action(async (options: { output?: string; dryRun?: boolean; profile?: string }) => {
      let config;
      let scope;
      try {
        const ctx = await resolveRuntimeContext({ profile: options.profile });
        config = ctx.config;
        scope = ctx.scope;
      } catch (err) {
        handleCliError(err);
      }
      if (!config || !scope) {
        console.error(
          'No project selected for this profile. Run "grant start" first or set GRANT_SCOPE_ID and GRANT_SCOPE_TENANT.'
        );
        process.exitCode = 1;
        return;
      }

      const outputPath = resolve(
        process.cwd(),
        options.output ?? config.generateTypesOutputPath ?? DEFAULT_OUTPUT
      );
      const dryRun = options.dryRun === true;

      try {
        const accessToken = await resolveAccessToken(config);

        const [resources, permissions] = await Promise.all([
          fetchResources(config.apiUrl, accessToken, scope, config.originVerifySecret),
          fetchPermissions(config.apiUrl, accessToken, scope, config.originVerifySecret),
        ]);

        const slugs = resources.map((r) => r.slug).filter(Boolean);
        const actions = permissions.map((p) => p.action).filter(Boolean);

        const content = generateTypesContent(slugs, actions);

        if (dryRun) {
          console.log('Dry run: would write to', outputPath);
          console.log('---');
          console.log(content);
          return;
        }

        await writeFile(outputPath, content, { encoding: 'utf-8' });
        console.log('Generated', outputPath);
        console.log('  Resources:', resources.length, '→', slugs.length, 'unique slugs');
        console.log('  Permissions:', permissions.length, '→', actions.length, 'unique actions');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isUnauthorized =
          config.authMethod === 'session' &&
          (msg.includes('401') ||
            msg.includes('Unauthorized') ||
            /failed\s*\(\s*401\s*\)/i.test(msg));
        if (isUnauthorized) {
          console.error('\nSession expired or invalid. Run "grant start" to sign in again.');
        } else {
          console.error('\n' + msg);
        }
        process.exitCode = 1;
      }
    });
}
