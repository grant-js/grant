import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  DEFAULT_PROFILE_NAME,
  getConfigDir,
  getConfigPath,
  getProfileConfig,
  listProfileNames,
  loadConfigFile,
  resolveProfileName,
  saveConfigFile,
} from './storage.js';
import type { GrantConfigFile } from '../types/config.js';

describe('resolveProfileName', () => {
  it('returns profile flag when provided', () => {
    const file: GrantConfigFile = { defaultProfile: 'default', profiles: {} };
    expect(resolveProfileName(file, 'staging')).toBe('staging');
    expect(resolveProfileName(file, '  staging  ')).toBe('staging');
  });

  it('returns defaultProfile when flag is undefined', () => {
    const file: GrantConfigFile = { defaultProfile: 'staging', profiles: {} };
    expect(resolveProfileName(file, undefined)).toBe('staging');
  });

  it('returns DEFAULT_PROFILE_NAME when defaultProfile is empty and no flag', () => {
    const file: GrantConfigFile = { defaultProfile: '', profiles: {} };
    expect(resolveProfileName(file, undefined)).toBe(DEFAULT_PROFILE_NAME);
  });
});

describe('getProfileConfig', () => {
  it('returns config when profile exists', () => {
    const config = { apiUrl: 'http://localhost', authMethod: 'api-key' as const };
    const file: GrantConfigFile = { defaultProfile: 'default', profiles: { default: config } };
    expect(getProfileConfig(file, 'default')).toEqual(config);
  });

  it('returns null when profile does not exist', () => {
    const file: GrantConfigFile = { defaultProfile: 'default', profiles: {} };
    expect(getProfileConfig(file, 'missing')).toBeNull();
  });
});

describe('listProfileNames', () => {
  it('returns profile keys', () => {
    const file: GrantConfigFile = {
      defaultProfile: 'default',
      profiles: { default: {} as never, staging: {} as never },
    };
    expect(listProfileNames(file).sort()).toEqual(['default', 'staging']);
  });

  it('returns empty array when file is null', () => {
    expect(listProfileNames(null)).toEqual([]);
  });

  it('returns empty array when profiles is missing', () => {
    expect(listProfileNames({ defaultProfile: 'default', profiles: undefined as never })).toEqual(
      []
    );
  });
});

describe('loadConfigFile / saveConfigFile', () => {
  let tmpDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'grant-cli-test-'));
    originalXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tmpDir;
  });

  afterEach(() => {
    process.env.XDG_CONFIG_HOME = originalXdg;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and loads config file with profiles', async () => {
    const file: GrantConfigFile = {
      defaultProfile: 'default',
      profiles: {
        default: {
          apiUrl: 'http://localhost:4000',
          authMethod: 'api-key',
          apiKey: {
            clientId: 'id',
            clientSecret: 'secret',
            scope: { tenant: 'accountProject', id: 'a:b' },
          },
          selectedScope: { tenant: 'accountProject', id: 'a:b' },
        },
      },
    };
    await saveConfigFile(file);
    const loaded = await loadConfigFile();
    expect(loaded).not.toBeNull();
    expect(loaded!.defaultProfile).toBe('default');
    expect(loaded!.profiles.default?.apiUrl).toBe('http://localhost:4000');
    expect(loaded!.profiles.default?.selectedScope?.id).toBe('a:b');
  });

  it('returns null when file does not exist', async () => {
    process.env.XDG_CONFIG_HOME = join(tmpDir, 'nonexistent-empty');
    const loaded = await loadConfigFile();
    expect(loaded).toBeNull();
  });
});

describe('loadConfigFile migration', () => {
  let tmpDir: string;
  let configDir: string;
  let configPath: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'grant-cli-test-'));
    configDir = join(tmpDir, 'grant');
    configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true });
    originalXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tmpDir;
  });

  afterEach(() => {
    process.env.XDG_CONFIG_HOME = originalXdg;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('migrates legacy single-config to profiles shape', async () => {
    const legacy = {
      apiUrl: 'http://localhost:4000',
      authMethod: 'api-key' as const,
      apiKey: {
        clientId: 'id',
        clientSecret: 'secret',
        scope: { tenant: 'accountProject', id: 'a:b' },
      },
      selectedScope: { tenant: 'accountProject', id: 'a:b' },
    };
    writeFileSync(configPath, JSON.stringify(legacy), 'utf-8');

    const loaded = await loadConfigFile();
    expect(loaded).not.toBeNull();
    expect(loaded!.defaultProfile).toBe(DEFAULT_PROFILE_NAME);
    expect(loaded!.profiles[DEFAULT_PROFILE_NAME]).toEqual(legacy);

    const raw = readFileSync(getConfigPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.profiles).toBeDefined();
    expect(parsed.defaultProfile).toBe(DEFAULT_PROFILE_NAME);
  });
});
