/**
 * Tenant-scale CDM documents, for measuring what a real sync payload costs on the
 * wire. Correctness fixtures live in `cdm-sync-fixtures.ts`; nothing here asserts
 * behavior.
 *
 * These are deliberately not uniform filler. Repeated filler gzips to almost
 * nothing and would make Lambda's 6 MB request cap look survivable at any tenant
 * size. The entropy that resists gzip in real CDM is reproduced here: UUID and
 * email user keys, opaque API-key client ids and secrets, prose descriptions drawn
 * from a word pool, and metadata whose keys repeat while its values do not.
 *
 * Generation is deterministic — same profile in, same bytes out — so a recorded
 * measurement can be reproduced and re-checked when the CDM shape changes.
 *
 * `searchable` is omitted throughout: `startProjectSyncRequestSchema` does not
 * accept it, and REST ingress is the constraint being measured. A GraphQL client
 * that sends it pays more than the numbers here.
 */

import { CdmFindBy, CdmModeStrategy, type SyncProjectInput } from '@grantjs/schema';

export interface CdmScaleProfile {
  /** Stable identifier used as the row label in measurement output. */
  name: string;
  /** One-line description of the tenant this profile stands in for. */
  shape: string;
  users: number;
  resources: number;
  /** Permissions generated = `resources * actionsPerResource`. */
  actionsPerResource: number;
  roles: number;
  groups: number;
  tags: number;
  /** Fraction of users carrying an API key — the least compressible content. */
  apiKeyRatio: number;
  /** Fraction of entities carrying a metadata object. */
  metadataRatio: number;
  /** Fraction of entities carrying a prose description. */
  descriptionRatio: number;
}

/**
 * Four plausible tenants plus one deliberate upper bound. The bound exists because
 * a ceiling derived from the average ratio is an optimistic ceiling: it is the
 * least compressible document the CDM shape permits, and it is what the recorded
 * ceiling is derived from.
 */
export const CDM_SCALE_PROFILES: readonly CdmScaleProfile[] = [
  {
    name: 'starter',
    shape: 'single team, hand-authored catalog',
    users: 25,
    resources: 20,
    actionsPerResource: 3,
    roles: 8,
    groups: 5,
    tags: 6,
    apiKeyRatio: 0.08,
    metadataRatio: 0.2,
    descriptionRatio: 0.5,
  },
  {
    name: 'team',
    shape: 'one product, a few hundred seats',
    users: 250,
    resources: 60,
    actionsPerResource: 4,
    roles: 25,
    groups: 30,
    tags: 15,
    apiKeyRatio: 0.12,
    metadataRatio: 0.4,
    descriptionRatio: 0.6,
  },
  {
    name: 'department',
    shape: 'IdP-sourced import, thousands of seats',
    users: 2_500,
    resources: 150,
    actionsPerResource: 5,
    roles: 60,
    groups: 150,
    tags: 40,
    apiKeyRatio: 0.15,
    metadataRatio: 0.7,
    descriptionRatio: 0.7,
  },
  {
    name: 'enterprise',
    shape: 'full-directory import, tens of thousands of seats',
    users: 25_000,
    resources: 400,
    actionsPerResource: 6,
    roles: 200,
    groups: 800,
    tags: 80,
    apiKeyRatio: 0.2,
    metadataRatio: 0.85,
    descriptionRatio: 0.8,
  },
  {
    name: 'entropy-bound',
    shape: 'upper bound on incompressibility — every user has an API key and metadata',
    users: 25_000,
    resources: 400,
    actionsPerResource: 6,
    roles: 200,
    groups: 800,
    tags: 80,
    apiKeyRatio: 1,
    metadataRatio: 1,
    descriptionRatio: 1,
  },
] as const;

// ---------------------------------------------------------------------------
// Deterministic generation
// ---------------------------------------------------------------------------

/** mulberry32 — small, seedable, and good enough for fixture entropy. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEX = '0123456789abcdef';
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const FIRST_NAMES = [
  'ana',
  'bruno',
  'carla',
  'diego',
  'elena',
  'felipe',
  'gabriela',
  'hugo',
  'ines',
  'javier',
  'karla',
  'lucas',
  'marta',
  'nuno',
  'olga',
  'pablo',
  'rita',
  'sofia',
  'tomas',
  'ursula',
  'victor',
  'wanda',
  'ximena',
  'yago',
];

const LAST_NAMES = [
  'alves',
  'barros',
  'castro',
  'dominguez',
  'esteban',
  'ferreira',
  'gomes',
  'herrera',
  'iglesias',
  'jimenez',
  'klein',
  'lopes',
  'moreno',
  'navarro',
  'ortega',
  'pereira',
  'quintana',
  'ramirez',
  'santos',
  'torres',
];

const DOMAINS = ['example.com', 'corp.example.net', 'eu.example.org', 'contoso.example'];

const RESOURCE_NOUNS = [
  'invoice',
  'ledger',
  'grant',
  'award',
  'budget',
  'milestone',
  'report',
  'contract',
  'disbursement',
  'applicant',
  'reviewer',
  'portfolio',
  'programme',
  'attachment',
  'workflow',
  'approval',
  'audit-trail',
  'beneficiary',
];

const RESOURCE_QUALIFIERS = ['draft', 'archived', 'external', 'internal', 'legacy', 'pilot'];

const ACTIONS = ['read', 'create', 'update', 'delete', 'approve', 'export', 'share', 'archive'];

const PROSE = [
  'grants',
  'scoped',
  'access',
  'to',
  'the',
  'programme',
  'record',
  'for',
  'reviewers',
  'assigned',
  'during',
  'the',
  'current',
  'funding',
  'cycle',
  'excluding',
  'financial',
  'attachments',
  'and',
  'personally',
  'identifying',
  'beneficiary',
  'detail',
  'which',
  'require',
  'a',
  'separate',
  'grant',
];

const DEPARTMENTS = ['finance', 'programmes', 'compliance', 'operations', 'research', 'legal'];
const COLORS = ['blue', 'green', 'amber', 'red', 'violet', 'slate', 'teal', 'rose'];

function pick<T>(rand: () => number, pool: readonly T[]): T {
  return pool[Math.floor(rand() * pool.length)] as T;
}

function hex(rand: () => number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += HEX[Math.floor(rand() * 16)];
  return out;
}

/** UUIDv4-shaped, deterministic. Not cryptographically anything. */
function uuid(rand: () => number): string {
  return `${hex(rand, 8)}-${hex(rand, 4)}-4${hex(rand, 3)}-a${hex(rand, 3)}-${hex(rand, 12)}`;
}

function secret(rand: () => number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += BASE62[Math.floor(rand() * BASE62.length)];
  return out;
}

function sentence(rand: () => number, words: number): string {
  const parts: string[] = [];
  for (let i = 0; i < words; i++) parts.push(pick(rand, PROSE));
  return parts.join(' ');
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function entityMetadata(rand: () => number): Record<string, unknown> {
  return {
    source: pick(rand, ['okta', 'entra-id', 'workday', 'manual', 'terraform']),
    externalId: uuid(rand),
    department: pick(rand, DEPARTMENTS),
    costCenter: `CC-${Math.floor(rand() * 9000) + 1000}`,
    syncedAt: new Date(Date.UTC(2026, 7, 1 + Math.floor(rand() * 24))).toISOString(),
  };
}

/**
 * Build a CDM document matching `profile`. Two calls with the same profile and
 * seed produce byte-identical JSON.
 */
export function generateCdmAtScale(profile: CdmScaleProfile, seed = 0x5ea1): SyncProjectInput {
  const rand = createRandom(seed);

  const tags = Array.from({ length: profile.tags }, (_, i) => {
    const key = `tag-${pick(rand, DEPARTMENTS)}-${i}`;
    return {
      key,
      name: titleCase(key.replace(/-/g, ' ')),
      color: pick(rand, COLORS),
      metadata: rand() < profile.metadataRatio ? entityMetadata(rand) : null,
    };
  });
  const tagKeys = tags.map((t) => t.key);

  const resources = Array.from({ length: profile.resources }, (_, i) => {
    const key = `${pick(rand, RESOURCE_NOUNS)}-${pick(rand, RESOURCE_QUALIFIERS)}-${i}`;
    const actions = ACTIONS.slice(0, profile.actionsPerResource);
    return {
      key,
      slug: key,
      name: titleCase(key.replace(/-/g, ' ')),
      description: rand() < profile.descriptionRatio ? sentence(rand, 14) : null,
      actions,
      tags: tagKeys.length > 0 && rand() < 0.5 ? [pick(rand, tagKeys)] : [],
      primaryTag: null,
      metadata: rand() < profile.metadataRatio ? entityMetadata(rand) : null,
    };
  });

  const permissions = resources.flatMap((resource) =>
    resource.actions.map((action) => ({
      key: `${resource.key}:${action}`,
      resource: resource.key,
      action,
      name: `${resource.name}: ${action}`,
      description: rand() < profile.descriptionRatio ? sentence(rand, 10) : null,
      condition:
        rand() < 0.15
          ? { field: 'metadata.department', operator: 'eq', value: pick(rand, DEPARTMENTS) }
          : null,
      groups: [],
      tags: [],
      primaryTag: null,
      metadata: rand() < profile.metadataRatio ? entityMetadata(rand) : null,
    }))
  );
  const permissionKeys = permissions.map((p) => p.key);

  const groups = Array.from({ length: profile.groups }, (_, i) => {
    const key = `group-${pick(rand, DEPARTMENTS)}-${i}`;
    return {
      key,
      name: titleCase(key.replace(/-/g, ' ')),
      description: rand() < profile.descriptionRatio ? sentence(rand, 12) : null,
      permissions: samplePermissions(rand, permissionKeys, 2, 8),
      tags: tagKeys.length > 0 && rand() < 0.4 ? [pick(rand, tagKeys)] : [],
      primaryTag: null,
      metadata: rand() < profile.metadataRatio ? entityMetadata(rand) : null,
    };
  });
  const groupKeys = groups.map((g) => g.key);

  const roles = Array.from({ length: profile.roles }, (_, i) => {
    const key = `role-${pick(rand, DEPARTMENTS)}-${i}`;
    const usesGroups = groupKeys.length > 0 && rand() < 0.5;
    return {
      key,
      name: titleCase(key.replace(/-/g, ' ')),
      description: rand() < profile.descriptionRatio ? sentence(rand, 12) : null,
      groups: usesGroups ? sampleKeys(rand, groupKeys, 1, 3) : [],
      permissions: usesGroups ? [] : samplePermissions(rand, permissionKeys, 3, 12),
      tags: tagKeys.length > 0 && rand() < 0.4 ? [pick(rand, tagKeys)] : [],
      primaryTag: null,
      metadata: rand() < profile.metadataRatio ? entityMetadata(rand) : null,
    };
  });
  const roleKeys = roles.map((r) => r.key);

  const users = Array.from({ length: profile.users }, (_, i) => {
    const first = pick(rand, FIRST_NAMES);
    const last = pick(rand, LAST_NAMES);
    // Real imports mix both: an IdP feed carries stable ids, a CSV carries emails.
    const byId = rand() < 0.35;
    const key = byId
      ? { value: uuid(rand), findBy: CdmFindBy.Id }
      : { value: `${first}.${last}${i}@${pick(rand, DOMAINS)}`, findBy: CdmFindBy.Email };

    const apiKeys =
      rand() < profile.apiKeyRatio
        ? [
            {
              key: `key-${hex(rand, 8)}`,
              clientId: uuid(rand),
              clientSecret: secret(rand, 48),
              name: `${titleCase(first)} service key`,
              description: null,
              expiresAt: null,
              metadata: null,
            },
          ]
        : [];

    return {
      key,
      name: `${titleCase(first)} ${titleCase(last)}`,
      roles: roleKeys.length > 0 ? sampleKeys(rand, roleKeys, 1, 3) : [],
      groups: groupKeys.length > 0 && rand() < 0.6 ? sampleKeys(rand, groupKeys, 1, 4) : [],
      permissions: rand() < 0.1 ? samplePermissions(rand, permissionKeys, 1, 2) : [],
      tags: tagKeys.length > 0 && rand() < 0.3 ? [pick(rand, tagKeys)] : [],
      primaryTag: null,
      apiKeys,
      metadata: rand() < profile.metadataRatio ? entityMetadata(rand) : null,
    };
  });

  return {
    version: 1,
    mode: { strategy: CdmModeStrategy.Merge, onConflict: null, confirmDestructive: false },
    tags,
    resources,
    permissions,
    groups,
    roles,
    users,
  };
}

function sampleKeys(rand: () => number, pool: string[], min: number, max: number): string[] {
  const count = Math.min(pool.length, min + Math.floor(rand() * (max - min + 1)));
  const picked = new Set<string>();
  // Bounded: at most 4x the requested count, so a small pool cannot spin here.
  for (let attempt = 0; picked.size < count && attempt < count * 4; attempt++) {
    picked.add(pick(rand, pool));
  }
  return [...picked];
}

function samplePermissions(rand: () => number, pool: string[], min: number, max: number): string[] {
  return pool.length === 0 ? [] : sampleKeys(rand, pool, min, max);
}
