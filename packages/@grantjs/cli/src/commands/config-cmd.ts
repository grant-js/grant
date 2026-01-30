import type { Command } from 'commander';
import { existsSync } from 'node:fs';
import {
  getConfigPath,
  loadConfigFile,
  loadProfile,
  listProfileNames,
  resolveProfileName,
  saveConfigFile,
} from '../config/index.js';
import type { GrantConfig, GrantConfigFile, GrantScope } from '../types/config.js';

const VALID_TENANTS = ['accountProject', 'organizationProject'] as const;

async function requireProfile(profileFlag?: string): Promise<{
  file: GrantConfigFile;
  config: GrantConfig;
  profileName: string;
}> {
  const result = await loadProfile(profileFlag);
  if (!result) {
    console.error('No config found, or profile does not exist. Run "grant start" first.');
    process.exit(1);
  }
  return result;
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeApiUrl(input: string): string {
  return input.trim().replace(/\/+$/, '') || input;
}

function isValidScopeId(s: string): boolean {
  const parts = s.trim().split(':');
  if (parts.length !== 1 && parts.length !== 2) return false;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return parts.every((p) => uuidRe.test(p.trim()));
}

export function createConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('View and edit Grant CLI config (path, list, show, set)');

  configCmd
    .command('path')
    .description('Print the path to the config file')
    .action(() => {
      console.log(getConfigPath());
    });

  configCmd
    .command('list')
    .description('List profile names and show which is the default')
    .action(async () => {
      const file = await loadConfigFile();
      const path = getConfigPath();
      const exists = existsSync(path);
      console.log('Config path:', path);
      console.log('Exists:', exists);
      if (!file || Object.keys(file.profiles).length === 0) {
        console.log('No profiles. Run "grant start" to create one.');
        return;
      }
      const names = listProfileNames(file);
      const defaultName = file.defaultProfile || names[0];
      console.log('Default profile:', defaultName);
      names.forEach((name) => {
        const marker = name === defaultName ? ' (default)' : '';
        console.log('  -', name + marker);
      });
    });

  configCmd
    .command('show')
    .description('Show config summary for a profile (path, apiUrl, authMethod, scope; no secrets)')
    .option('-p, --profile <name>', 'Profile to show (default: default profile)')
    .action(async (options: { profile?: string }) => {
      const path = getConfigPath();
      const exists = existsSync(path);
      console.log('Config path:', path);
      console.log('Exists:', exists);
      const result = await loadProfile(options.profile);
      if (!result) {
        console.log('No config or profile not found. Run "grant start" first.');
        return;
      }
      const { config, profileName } = result;
      console.log('Profile:', profileName);
      console.log('API URL:', config.apiUrl);
      console.log('Auth method:', config.authMethod);
      if (config.selectedScope) {
        console.log('Selected scope:', `${config.selectedScope.tenant}:${config.selectedScope.id}`);
      }
      if (config.generateTypesOutputPath) {
        console.log('Generate-types output:', config.generateTypesOutputPath);
      }
    });

  const setCmd = configCmd
    .command('set')
    .description(
      'Set a config value for a profile (use a subcommand: api-url, auth-method, credentials, scope, generate-types-output, default-profile)'
    )
    .option('-p, --profile <name>', 'Profile to update (default: default profile)');

  setCmd
    .command('api-url <url>')
    .description('Set the Grant API base URL (e.g. http://localhost:4000)')
    .action(async (url: string, cmd: Command) => {
      const profileFlag = cmd.parent?.opts?.()?.profile;
      const { file, config, profileName } = await requireProfile(profileFlag);
      const normalized = normalizeApiUrl(url);
      if (!normalized) {
        console.error('URL is required.');
        process.exit(1);
      }
      if (!isValidUrl(normalized)) {
        console.error('Enter a valid URL (e.g. https://grant.example.com)');
        process.exit(1);
      }
      config.apiUrl = normalized;
      file.profiles[profileName] = config;
      await saveConfigFile(file);
      console.log('api-url set to', config.apiUrl, '(profile:', profileName + ')');
    });

  setCmd
    .command('auth-method <method>')
    .description('Set authentication method: session or api-key')
    .action(async (method: string, cmd: Command) => {
      const profileFlag = cmd.parent?.opts?.()?.profile;
      const { file, config, profileName } = await requireProfile(profileFlag);
      const m = method.toLowerCase();
      if (m !== 'session' && m !== 'api-key') {
        console.error('auth-method must be "session" or "api-key"');
        process.exit(1);
      }
      config.authMethod = m as 'session' | 'api-key';
      if (config.authMethod === 'session') {
        delete config.apiKey;
      } else {
        delete config.session;
      }
      file.profiles[profileName] = config;
      await saveConfigFile(file);
      console.log('auth-method set to', config.authMethod, '(profile:', profileName + ')');
    });

  setCmd
    .command('credentials')
    .description('Set API key credentials (client ID, secret, and scope)')
    .option('--client-id <id>', 'API key client ID (UUID)')
    .option('--client-secret <secret>', 'API key client secret (min 32 characters)')
    .option('--scope-tenant <tenant>', `Scope tenant: ${VALID_TENANTS.join(' or ')}`)
    .option('--scope-id <id>', 'Scope ID (e.g. accountId:projectId or organizationId:projectId)')
    .action(
      async (
        opts: { clientId?: string; clientSecret?: string; scopeTenant?: string; scopeId?: string },
        cmd: Command
      ) => {
        const profileFlag = cmd.parent?.opts?.()?.profile;
        const { file, config, profileName } = await requireProfile(profileFlag);
        const { clientId, clientSecret, scopeTenant, scopeId } = opts;
        if (!clientId?.trim()) {
          console.error('--client-id is required');
          process.exit(1);
        }
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            clientId.trim()
          )
        ) {
          console.error('--client-id must be a valid UUID');
          process.exit(1);
        }
        if (!clientSecret || clientSecret.length < 32) {
          console.error('--client-secret is required and must be at least 32 characters');
          process.exit(1);
        }
        if (
          !scopeTenant ||
          !VALID_TENANTS.includes(scopeTenant as (typeof VALID_TENANTS)[number])
        ) {
          console.error('--scope-tenant is required and must be one of:', VALID_TENANTS.join(', '));
          process.exit(1);
        }
        if (!scopeId?.trim()) {
          console.error('--scope-id is required');
          process.exit(1);
        }
        if (!isValidScopeId(scopeId)) {
          console.error('--scope-id must be one UUID or two UUIDs separated by a colon');
          process.exit(1);
        }
        const scope: GrantScope = { tenant: scopeTenant, id: scopeId.trim() };
        config.authMethod = 'api-key';
        config.apiKey = {
          clientId: clientId.trim(),
          clientSecret,
          scope,
        };
        config.selectedScope = scope;
        delete config.session;
        file.profiles[profileName] = config;
        await saveConfigFile(file);
        console.log('credentials and scope updated (profile:', profileName + ')');
      }
    );

  setCmd
    .command('scope')
    .description('Set the selected project scope (tenant and ID)')
    .option('--tenant <tenant>', `Scope tenant: ${VALID_TENANTS.join(' or ')}`)
    .option('--scope-id <id>', 'Scope ID (e.g. accountId:projectId or organizationId:projectId)')
    .action(async (options: { tenant?: string; scopeId?: string }, cmd: Command) => {
      const profileFlag = cmd.parent?.opts?.()?.profile;
      const { file, config, profileName } = await requireProfile(profileFlag);
      const { tenant, scopeId } = options;
      if (!tenant || !VALID_TENANTS.includes(tenant as (typeof VALID_TENANTS)[number])) {
        console.error('--tenant is required and must be one of:', VALID_TENANTS.join(', '));
        process.exit(1);
      }
      if (!scopeId?.trim()) {
        console.error('--scope-id is required');
        process.exit(1);
      }
      if (!isValidScopeId(scopeId)) {
        console.error('--scope-id must be one UUID or two UUIDs separated by a colon');
        process.exit(1);
      }
      config.selectedScope = { tenant, id: scopeId.trim() };
      file.profiles[profileName] = config;
      await saveConfigFile(file);
      console.log(
        'scope set to',
        config.selectedScope!.tenant + ':' + config.selectedScope!.id,
        '(profile:',
        profileName + ')'
      );
    });

  setCmd
    .command('generate-types-output <path>')
    .description('Set default output path for grant generate-types (e.g. ./src/grant-types.ts)')
    .action(async (path: string, cmd: Command) => {
      const profileFlag = cmd.parent?.opts?.()?.profile;
      const { file, config, profileName } = await requireProfile(profileFlag);
      const trimmed = path.trim();
      if (!trimmed) {
        delete config.generateTypesOutputPath;
        file.profiles[profileName] = config;
        await saveConfigFile(file);
        console.log(
          'generate-types-output cleared (will use ./grant-types.ts) (profile:',
          profileName + ')'
        );
        return;
      }
      if (!trimmed.endsWith('.ts')) {
        console.error('Path should end with .ts');
        process.exit(1);
      }
      config.generateTypesOutputPath = trimmed;
      file.profiles[profileName] = config;
      await saveConfigFile(file);
      console.log(
        'generate-types-output set to',
        config.generateTypesOutputPath,
        '(profile:',
        profileName + ')'
      );
    });

  setCmd
    .command('default-profile <name>')
    .description('Set the default profile (used when --profile is not passed)')
    .action(async (name: string) => {
      const file = await loadConfigFile();
      if (!file) {
        console.error('No config found. Run "grant start" first.');
        process.exit(1);
      }
      const trimmed = name.trim();
      if (!file.profiles[trimmed]) {
        console.error(
          'Profile "' + trimmed + '" does not exist. Use "grant config list" to see profiles.'
        );
        process.exit(1);
      }
      file.defaultProfile = trimmed;
      await saveConfigFile(file);
      console.log('default profile set to', trimmed);
    });
}
