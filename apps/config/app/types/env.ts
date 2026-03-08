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
}
