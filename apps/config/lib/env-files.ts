/**
 * Read and write .env files. Used only in API routes (Node).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ENCODING = 'utf-8' as const;

/** Parse .env content into a map. Preserves which keys were present. */
export function parseEnvContent(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).replace(/\\(.)/g, '$1');
    }
    map.set(key, value);
  }
  return map;
}

/** Read a single .env file and return key -> value. Returns empty map if file missing. */
export function readEnvFile(absPath: string): Map<string, string> {
  if (!existsSync(absPath)) return new Map();
  const content = readFileSync(absPath, ENCODING);
  return parseEnvContent(content);
}

/** Update one key in .env file content; add at end if not present. Preserves comments and order. */
function updateEnvLine(content: string, key: string, value: string): string {
  const lines = content.split(/\r?\n/);
  const keyEq = key + '=';
  let found = false;
  const out: string[] = [];
  for (const line of lines) {
    if (
      line.trimStart().startsWith(keyEq) ||
      (line.trimStart().startsWith(key) && line.includes('='))
    ) {
      out.push(`${key}=${escapeEnvValue(value)}`);
      found = true;
    } else {
      out.push(line);
    }
  }
  if (!found) {
    if (out.length && !out[out.length - 1].endsWith('\n') && out[out.length - 1].trim() !== '') {
      out.push('');
    }
    out.push(`${key}=${escapeEnvValue(value)}`);
  }
  return out.join('\n');
}

function escapeEnvValue(value: string): string {
  if (!value.includes('"') && !value.includes('\n') && !value.includes(' ')) return value;
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

/** Write a single key to a .env file. Creates file and parent dir if needed. */
export function writeEnvKey(
  absPath: string,
  key: string,
  value: string,
  existingContent?: string
): void {
  const dir = dirname(absPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const content = existingContent ?? (existsSync(absPath) ? readFileSync(absPath, ENCODING) : '');
  const next = updateEnvLine(content, key, value);
  writeFileSync(absPath, next, ENCODING);
}

/** Read all env files under repo root and return { filePath -> { key -> value } }. */
export function readAllEnvFiles(
  repoRoot: string,
  filePaths: string[]
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const rel of filePaths) {
    const abs = resolve(repoRoot, rel);
    const map = readEnvFile(abs);
    result[rel] = Object.fromEntries(map);
  }
  return result;
}

/** Write key/value to one or more files (for sync). Uses existing file content when updating. */
export function writeEnvKeyToFiles(
  repoRoot: string,
  key: string,
  value: string,
  relativePaths: string[]
): void {
  for (const rel of relativePaths) {
    const abs = resolve(repoRoot, rel);
    const existing = existsSync(abs) ? readFileSync(abs, ENCODING) : '';
    writeEnvKey(abs, key, value, existing);
  }
}
