import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

import type { GrantConfig, GrantConfigFile } from '../types/config.js';

const CONFIG_DIR_NAME = 'grant';
const CONFIG_FILE_NAME = 'config.json';
const DEFAULT_PROFILE_NAME = 'default';

/**
 * Returns the platform-specific config directory for Grant CLI.
 * - Windows: %APPDATA%\grant
 * - Linux/macOS: $XDG_CONFIG_HOME/grant or ~/.config/grant
 */
export function getConfigDir(): string {
  if (platform() === 'win32') {
    const appData = process.env.APPDATA;
    if (!appData) {
      return join(homedir(), 'AppData', 'Roaming', CONFIG_DIR_NAME);
    }
    return join(appData, CONFIG_DIR_NAME);
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) {
    return join(xdg, CONFIG_DIR_NAME);
  }
  return join(homedir(), '.config', CONFIG_DIR_NAME);
}

/**
 * Returns the path to the config file (config dir + config.json).
 */
export function getConfigPath(): string {
  return join(getConfigDir(), CONFIG_FILE_NAME);
}

/** Detect legacy single-profile config (apiUrl at top level, no profiles). */
function isLegacyConfig(data: unknown): data is GrantConfig {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  return typeof o.apiUrl === 'string' && !('profiles' in o);
}

/**
 * Load config file from disk. Migrates legacy single-config to profiles shape.
 * Returns null if file does not exist or is invalid.
 */
export async function loadConfigFile(): Promise<GrantConfigFile | null> {
  const path = getConfigPath();
  try {
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object') return null;

    if (isLegacyConfig(data)) {
      const file: GrantConfigFile = {
        defaultProfile: DEFAULT_PROFILE_NAME,
        profiles: { [DEFAULT_PROFILE_NAME]: data },
      };
      await saveConfigFile(file);
      return file;
    }

    const file = data as GrantConfigFile;
    if (
      typeof file.defaultProfile !== 'string' ||
      !file.profiles ||
      typeof file.profiles !== 'object'
    ) {
      return null;
    }
    return file;
  } catch {
    return null;
  }
}

/**
 * Save config file to disk. Creates config dir if needed. Sets file mode to 0o600 (owner read/write only).
 */
export async function saveConfigFile(file: GrantConfigFile): Promise<void> {
  const dir = getConfigDir();
  const path = getConfigPath();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify(file, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
    flag: 'w',
  });
}

/**
 * Resolve which profile name to use: explicit name, or file's default, or "default".
 */
export function resolveProfileName(file: GrantConfigFile, profileFlag: string | undefined): string {
  if (profileFlag?.trim()) return profileFlag.trim();
  return file.defaultProfile || DEFAULT_PROFILE_NAME;
}

/**
 * Get config for a profile. Returns null if profile does not exist.
 */
export function getProfileConfig(file: GrantConfigFile, profileName: string): GrantConfig | null {
  return file.profiles[profileName] ?? null;
}

/**
 * List profile names. Returns empty array if no file.
 */
export function listProfileNames(file: GrantConfigFile | null): string[] {
  if (!file?.profiles) return [];
  return Object.keys(file.profiles);
}

/** Default profile name constant for use in prompts/help. */
export { DEFAULT_PROFILE_NAME };

/**
 * Load config file and return the default profile's config.
 * Convenience for callers that only need one profile (default). Returns null if no file or default profile missing.
 */
export async function loadConfig(): Promise<GrantConfig | null> {
  const file = await loadConfigFile();
  if (!file) return null;
  const name = resolveProfileName(file, undefined);
  return getProfileConfig(file, name) ?? null;
}

/**
 * Load config file and return the resolved profile's config plus file and name.
 * Use when you need to read and then update (save) the file. Returns null if no file or profile does not exist.
 */
export async function loadProfile(profileFlag?: string): Promise<{
  file: GrantConfigFile;
  config: GrantConfig;
  profileName: string;
} | null> {
  const file = await loadConfigFile();
  if (!file) return null;
  const profileName = resolveProfileName(file, profileFlag);
  const config = getProfileConfig(file, profileName);
  if (!config) return null;
  return { file, config, profileName };
}
