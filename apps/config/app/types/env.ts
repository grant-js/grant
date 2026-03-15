import type { EnvVarMeta } from '@/lib/env-metadata';

export interface EnvVarValue {
  key: string;
  value: string;
  source: string;
  status: 'set' | 'missing' | 'empty';
}

export interface EnvStateResponse {
  repoRoot: string;
  files: Record<string, Record<string, string>>;
  vars: EnvVarValue[];
  meta: EnvVarMeta[];
  /** Default values from schema (for placeholders and "Default" badge). Stringify in UI. */
  defaults: Record<string, string | number | boolean>;
  /** Which root env file was read (e.g. .env, .env.demo). */
  selectedFile: string;
}
