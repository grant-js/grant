#!/usr/bin/env node

import { Command } from 'commander';

import { createConfigCommand } from './commands/config-cmd.js';
import { createGenerateTypesCommand } from './commands/generate-types.js';
import { createStartCommand } from './commands/start.js';
import { createVersionCommand } from './commands/version.js';

const program = new Command();

program
  .name('grant')
  .description('Grant CLI - Setup, authentication, and typings generation for @grantjs/server')
  .enablePositionalOptions()
  .addHelpText(
    'after',
    `
Examples:
  grant start                         Interactive setup (API URL, auth, scope)
  grant start --profile staging       Setup or update a named profile
  grant config list                   List profiles and default
  grant config show --profile staging Show config for a profile
  grant config set api-url http://localhost:4000 --profile default
  grant generate-types --profile staging   Generate types for a profile
  grant --help                        Show this help
  grant config set --help             Show help for config set subcommands
`
  );

createVersionCommand(program);
createConfigCommand(program);
createStartCommand(program);
createGenerateTypesCommand(program);

program.parse();
