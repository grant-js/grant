import { exec } from 'node:child_process';
import { createServer } from 'node:http';
import { platform } from 'node:os';

import inquirer from 'inquirer';

import {
  exchangeApiKey,
  exchangeCliCallback,
  fetchOrganizations,
  fetchProjects,
  loginWithEmail,
  type LoginAccount,
  type LoginResult,
  type OrganizationItem,
  type ProjectItem,
} from '../api/client.js';
import {
  DEFAULT_PROFILE_NAME,
  getConfigPath,
  loadConfigFile,
  saveConfigFile,
} from '../config/index.js';

import type { GrantConfig, GrantScope } from '../types/config.js';
import type { Command } from 'commander';

const AUTH_SESSION = 'session';
const AUTH_API_KEY = 'api-key';

const PROJECT_TENANTS = [
  { name: 'Account project (accountId:projectId)', value: 'accountProject' },
  { name: 'Organization project (organizationId:projectId)', value: 'organizationProject' },
] as const;

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeApiUrl(input: string): string {
  const s = input.trim().replace(/\/+$/, '');
  return s || input;
}

/** Scope ID must be one UUID or two UUIDs separated by a single colon (e.g. accountId:projectId). */
function isValidScopeId(s: string): boolean {
  const parts = s.trim().split(':');
  if (parts.length !== 1 && parts.length !== 2) return false;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return parts.every((p) => uuidRe.test(p.trim()));
}

/** Open URL in default browser (cross-platform). Do not encode the URL; it is already valid. */
function openBrowser(url: string): void {
  const cmd =
    platform() === 'win32'
      ? `start "" "${url}"`
      : platform() === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error('[Grant CLI] Could not open browser:', err.message);
  });
}

/**
 * Run local callback server and open GitHub OAuth; returns one-time code or throws on error.
 * Resolves when browser is redirected back with ?code= or ?error=.
 */
function runGithubOAuthCallback(apiUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const rawUrl = req.url ?? '/';
      const url = new URL(rawUrl, `http://localhost`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description') ?? '';

      const html = (title: string, body: string) =>
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;"><h2>${title}</h2><p>${body}</p><p>You can close this tab and return to the terminal.</p></body></html>`;

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html('Grant CLI – Signed in', 'Successfully signed in with GitHub.'));
        server.close();
        resolve(code);
        return;
      }
      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          html(
            'Grant CLI – Sign-in failed',
            `Error: ${error}${errorDescription ? `. ${errorDescription}` : ''}`
          )
        );
        server.close();
        reject(new Error(errorDescription || error));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(html('Grant CLI', 'Not found. Expecting ?code= or ?error= from OAuth redirect.'));
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Could not bind callback server'));
        return;
      }
      const port = addr.port;
      const redirectUri = `http://localhost:${port}`;
      const initiateUrl = `${apiUrl.replace(/\/+$/, '')}/api/auth/github?redirect=${encodeURIComponent(redirectUri)}`;
      openBrowser(initiateUrl);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

export function createStartCommand(program: Command): void {
  program
    .command('start')
    .alias('setup')
    .description(
      'Setup Grant: API URL, authentication (session or API key), account/project selection, and secure storage'
    )
    .option('-p, --profile <name>', 'Profile to create or update (default: default profile)')
    .addHelpText('after', '\nExample:\n  grant start --profile staging   # or grant setup\n')
    .action(async (options: { profile?: string }) => {
      if (!process.stdin.isTTY) {
        console.error(
          'Grant setup is interactive and requires a TTY. Run this command in a terminal.'
        );
        process.exit(1);
      }

      let file = await loadConfigFile();
      let profileName: string;
      if (options.profile?.trim()) {
        profileName = options.profile.trim();
      } else {
        const a = (await inquirer.prompt([
          {
            type: 'input' as const,
            name: 'profileName',
            message: 'Profile name',
            default: file?.defaultProfile ?? DEFAULT_PROFILE_NAME,
          },
        ])) as { profileName: string };
        profileName = a.profileName.trim() || DEFAULT_PROFILE_NAME;
      }
      const existingProfile = file?.profiles[profileName];
      const baseApiUrl = existingProfile?.apiUrl ?? '';

      const { apiUrlRaw, authMethod } = (await inquirer.prompt([
        {
          type: 'input' as const,
          name: 'apiUrlRaw',
          message: 'Grant API base URL',
          default: baseApiUrl || 'http://localhost:4000',
          validate: (input: string) => {
            const url = normalizeApiUrl(input);
            if (!url) return 'API URL is required';
            if (!isValidUrl(url)) return 'Enter a valid URL (e.g. https://grant.example.com)';
            return true;
          },
        },
        {
          type: 'select' as const,
          name: 'authMethod',
          message: 'Authentication method',
          choices: [
            { name: 'Session (log in via browser)', value: AUTH_SESSION },
            { name: 'API key (clientId + secret)', value: AUTH_API_KEY },
          ],
        },
      ])) as { apiUrlRaw: string; authMethod: string };

      const apiUrl = normalizeApiUrl(apiUrlRaw);

      if (authMethod === AUTH_SESSION) {
        const { signInMethod } = (await inquirer.prompt([
          {
            type: 'select' as const,
            name: 'signInMethod',
            message: 'Sign-in method',
            choices: [
              { name: 'Email', value: 'email' },
              { name: 'GitHub', value: 'github' },
            ],
          },
        ])) as { signInMethod: string };

        let loginResult: LoginResult;
        if (signInMethod === 'github') {
          console.log('\nOpening browser for GitHub sign-in…');
          let code: string;
          try {
            code = await runGithubOAuthCallback(apiUrl);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('\nGitHub sign-in failed:', msg);
            process.exit(1);
          }
          try {
            loginResult = await exchangeCliCallback(apiUrl, code);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('\n' + msg);
            process.exit(1);
          }
        } else {
          const sessionQuestions = [
            {
              type: 'input' as const,
              name: 'email',
              message: 'Email',
              validate: (input: string) => {
                if (!input?.trim()) return 'Email is required';
                return true;
              },
            },
            {
              type: 'password' as const,
              name: 'password',
              message: 'Password',
              mask: '*',
              validate: (input: string) => {
                if (!input?.trim()) return 'Password is required';
                return true;
              },
            },
          ];
          const { email, password } = (await inquirer.prompt(
            sessionQuestions as Parameters<typeof inquirer.prompt>[0]
          )) as { email: string; password: string };

          try {
            loginResult = await loginWithEmail(apiUrl, email.trim(), password);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('\n' + msg);
            process.exit(1);
          }
        }

        const { accounts, accessToken, refreshToken } = loginResult;
        if (accounts.length === 0) {
          console.error('\nNo accounts in login response.');
          process.exit(1);
        }

        // Account selector: user picks which account to use (scope for organizations/projects)
        let selectedAccount: LoginAccount;
        if (accounts.length === 1) {
          selectedAccount = accounts[0];
        } else {
          const orgAccounts = accounts.filter((a: LoginAccount) => a.type === 'organization');
          const accountChoices = accounts.map((a: LoginAccount) => {
            const label =
              a.type === 'personal'
                ? 'Personal account'
                : orgAccounts.length > 1
                  ? `Organization account (${a.id.slice(0, 8)})`
                  : 'Organization account';
            return { name: label, value: a };
          });
          const result = (await inquirer.prompt([
            {
              type: 'select' as const,
              name: 'selectedAccount',
              message: 'Select account',
              choices: accountChoices,
            },
          ])) as { selectedAccount: LoginAccount };
          selectedAccount = result.selectedAccount;
        }

        let organizations: OrganizationItem[] = [];
        if (selectedAccount.type === 'organization') {
          try {
            organizations = await fetchOrganizations(apiUrl, accessToken, {
              id: selectedAccount.id,
              tenant: 'account',
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('\n' + msg);
            process.exit(1);
          }
        }

        // Project scope: personal account → (account, id); organization account → (organization, orgId).
        // Projects live under account_projects (tenant=account) or organization_projects (tenant=organization).
        let selectedContext: { tenant: string; scopeId: string };
        if (selectedAccount.type === 'organization') {
          if (organizations.length === 0) {
            console.error(
              '\nNo organizations in this account. Create an organization in the Grant web app, then run grant start again.'
            );
            process.exit(1);
          }
          if (organizations.length === 1) {
            selectedContext = { tenant: 'organization', scopeId: organizations[0].id };
          } else {
            const result = (await inquirer.prompt([
              {
                type: 'select' as const,
                name: 'selectedContext',
                message: 'Select organization',
                choices: organizations.map((o) => ({
                  name: o.name,
                  value: { tenant: 'organization', scopeId: o.id } as {
                    tenant: string;
                    scopeId: string;
                  },
                })),
              },
            ])) as { selectedContext: { tenant: string; scopeId: string } };
            selectedContext = result.selectedContext;
          }
        } else {
          const contextChoices: Array<{
            name: string;
            value: { tenant: string; scopeId: string };
          }> = [
            { name: 'Personal account', value: { tenant: 'account', scopeId: selectedAccount.id } },
            ...organizations.map((o) => ({
              name: o.name,
              value: { tenant: 'organization', scopeId: o.id } as {
                tenant: string;
                scopeId: string;
              },
            })),
          ];
          if (contextChoices.length === 1) {
            selectedContext = contextChoices[0].value;
          } else {
            const result = (await inquirer.prompt([
              {
                type: 'select' as const,
                name: 'selectedContext',
                message: 'Select account or organization',
                choices: contextChoices,
              },
            ])) as { selectedContext: { tenant: string; scopeId: string } };
            selectedContext = result.selectedContext;
          }
        }

        let projects: ProjectItem[] = [];
        try {
          projects = await fetchProjects(apiUrl, accessToken, {
            tenant: selectedContext.tenant,
            id: selectedContext.scopeId,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('\n' + msg);
          process.exit(1);
        }

        if (projects.length === 0) {
          console.error(
            '\nNo projects in this scope. Create a project in the Grant web app, then run grant start again.'
          );
          process.exit(1);
        }

        const projectChoices = projects.map((p) => ({
          name: `${p.name} (${p.slug})`,
          value: p,
        }));
        const { selectedProject } = (await inquirer.prompt([
          {
            type: 'select' as const,
            name: 'selectedProject',
            message: 'Select project',
            choices: projectChoices,
          },
        ])) as { selectedProject: ProjectItem };

        const scope: GrantScope = {
          tenant: selectedContext.tenant === 'account' ? 'accountProject' : 'organizationProject',
          id: `${selectedContext.scopeId}:${selectedProject.id}`,
        };

        const { generateTypesOutputPathRaw: sessionGenPath } = (await inquirer.prompt([
          {
            type: 'input' as const,
            name: 'generateTypesOutputPathRaw',
            message:
              'Default output path for generate-types (optional, leave empty for ./grant-types.ts)',
            default: existingProfile?.generateTypesOutputPath ?? '',
            validate: (input: string) => {
              const s = input.trim();
              if (!s) return true;
              if (!s.endsWith('.ts')) return 'Path should end with .ts';
              return true;
            },
          },
        ])) as { generateTypesOutputPathRaw: string };
        const generateTypesOutputPath = sessionGenPath.trim() || undefined;

        const sessionConfig: GrantConfig = {
          apiUrl,
          authMethod: 'session',
          session: {
            token: accessToken,
            ...(refreshToken && { refreshToken }),
          },
          selectedScope: scope,
          ...(generateTypesOutputPath && { generateTypesOutputPath }),
        };

        if (!file) {
          file = { defaultProfile: profileName, profiles: { [profileName]: sessionConfig } };
        } else {
          file.profiles[profileName] = sessionConfig;
          if (!file.defaultProfile) {
            file.defaultProfile = profileName;
          }
        }
        await saveConfigFile(file);

        console.log('\nSetup complete. Config saved to:', getConfigPath());
        console.log('  Profile:', profileName);
        console.log('  API URL:', sessionConfig.apiUrl);
        console.log('  Auth: Session');
        console.log('  Scope tenant:', sessionConfig.selectedScope!.tenant);
        console.log('  Scope id:', sessionConfig.selectedScope!.id);
        if (sessionConfig.generateTypesOutputPath) {
          console.log('  Generate-types output:', sessionConfig.generateTypesOutputPath);
        }
        return;
      }

      // API-key path (inquirer v13 prompt array overload is strict; assert to satisfy types)
      const apiKeyQuestions = [
        {
          type: 'input' as const,
          name: 'clientId',
          message: 'API key client ID (UUID)',
          validate: (input: string) => {
            const trimmed = input.trim();
            if (!trimmed) return 'Client ID is required';
            if (
              !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                trimmed
              )
            ) {
              return 'Enter a valid UUID';
            }
            return true;
          },
        },
        {
          type: 'password' as const,
          name: 'clientSecret',
          message: 'API key client secret',
          mask: '*',
          validate: (input: string) => {
            if (!input || input.length < 32) return 'Client secret must be at least 32 characters';
            return true;
          },
        },
        {
          type: 'select' as const,
          name: 'scopeTenant',
          message: 'Scope tenant',
          choices: [...PROJECT_TENANTS],
        },
        {
          type: 'input' as const,
          name: 'scopeId',
          message: 'Scope ID (e.g. accountId:projectId or organizationId:projectId)',
          validate: (input: string) => {
            if (!input?.trim()) return 'Scope ID is required';
            if (!isValidScopeId(input))
              return 'Enter a valid scope ID: one UUID or two UUIDs separated by a colon';
            return true;
          },
        },
      ];
      const { clientId, clientSecret, scopeTenant, scopeId } = (await inquirer.prompt(
        apiKeyQuestions as Parameters<typeof inquirer.prompt>[0]
      )) as { clientId: string; clientSecret: string; scopeTenant: string; scopeId: string };

      const scope: GrantScope = {
        tenant: scopeTenant,
        id: scopeId.trim(),
      };

      try {
        await exchangeApiKey(apiUrl, {
          clientId: clientId.trim(),
          clientSecret,
          scope: { id: scope.id, tenant: scope.tenant },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('\n' + msg);
        process.exit(1);
      }

      const { generateTypesOutputPathRaw } = (await inquirer.prompt([
        {
          type: 'input' as const,
          name: 'generateTypesOutputPathRaw',
          message:
            'Default output path for generate-types (optional, leave empty for ./grant-types.ts)',
          default: existingProfile?.generateTypesOutputPath ?? '',
          validate: (input: string) => {
            const s = input.trim();
            if (!s) return true;
            if (!s.endsWith('.ts')) return 'Path should end with .ts';
            return true;
          },
        },
      ])) as { generateTypesOutputPathRaw: string };

      const generateTypesOutputPath = generateTypesOutputPathRaw.trim() || undefined;

      const config: GrantConfig = {
        apiUrl,
        authMethod: 'api-key',
        apiKey: {
          clientId: clientId.trim(),
          clientSecret,
          scope,
        },
        selectedScope: scope,
        ...(generateTypesOutputPath && { generateTypesOutputPath }),
      };

      if (!file) {
        file = { defaultProfile: profileName, profiles: { [profileName]: config } };
      } else {
        file.profiles[profileName] = config;
        if (!file.defaultProfile) {
          file.defaultProfile = profileName;
        }
      }
      await saveConfigFile(file);

      console.log('\nSetup complete. Config saved to:', getConfigPath());
      console.log('  Profile:', profileName);
      console.log('  API URL:', config.apiUrl);
      console.log('  Auth: API key');
      console.log('  Scope tenant:', config.selectedScope!.tenant);
      console.log('  Scope id:', config.selectedScope!.id);
      if (config.generateTypesOutputPath) {
        console.log('  Generate-types output:', config.generateTypesOutputPath);
      }
    });
}
