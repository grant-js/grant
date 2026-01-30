import type { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { fetchPermissions, fetchResources } from '../api/client.js';
import { loadProfile, resolveAccessToken, saveConfigFile } from '../config/index.js';
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
      const result = await loadProfile(options.profile);
      if (!result?.config?.selectedScope) {
        console.error(
          'No project selected for this profile. Run "grant start" first or use --profile <name>.'
        );
        process.exitCode = 1;
        return;
      }
      const config = result.config;
      const scope = result.config.selectedScope;

      const outputPath = resolve(
        process.cwd(),
        options.output ?? config.generateTypesOutputPath ?? DEFAULT_OUTPUT
      );
      const dryRun = options.dryRun === true;

      try {
        const accessToken = await resolveAccessToken(config, {
          onTokensRefreshed: (tokens) => {
            if (result!.config.session) {
              result!.config.session = {
                ...result!.config.session,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
              };
              result!.file.profiles[result!.profileName] = result!.config;
              void saveConfigFile(result!.file);
            }
          },
        });

        const [resources, permissions] = await Promise.all([
          fetchResources(config.apiUrl, accessToken, scope),
          fetchPermissions(config.apiUrl, accessToken, scope),
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
        console.error('\n' + msg);
        process.exitCode = 1;
      }
    });
}
