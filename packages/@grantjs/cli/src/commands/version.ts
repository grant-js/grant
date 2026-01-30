import { getPackageVersion } from '../utils/package.js';

import type { Command } from 'commander';

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
