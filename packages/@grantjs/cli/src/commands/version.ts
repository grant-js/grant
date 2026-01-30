import type { Command } from 'commander';

import { getPackageVersion } from '../utils/package.js';

export function createVersionCommand(program: Command): void {
  program
    .command('version')
    .description('Show CLI version (use -j for JSON)')
    .option('-j, --json', 'Output version as JSON')
    .action((options: { json?: boolean }) => {
      const version = getPackageVersion();
      if (options.json) {
        console.log(JSON.stringify({ version }));
      } else {
        console.log(version);
      }
    });
}
