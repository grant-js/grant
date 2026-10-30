/**
 * CDM import with a `password` (ADR 0011 slice 3), end to end below the transport.
 *
 * The real `ProjectImportService` with the default entity registry and the real
 * `CredentialService` run against in-memory authentication methods, project membership and
 * project credentials. The platform credential tables are wired to fail the test if they are
 * touched: an import writes the importing project's credential and nothing else, in a step
 * after the user assignment, and only for a person who is then a member of the project.
 *
 * What only a database can show (the project's RLS under the restricted role, the rollback of
 * a refused import) is in `tests/integration/project-import-credentials.postgres.integration.test.ts`.
 */
import type { CredentialWithHash } from '@grantjs/core';
import {
  CdmFindBy,
  CdmModeStrategy,
  CdmPasswordAlgorithm,
  type Scope,
  Tenant,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { genSaltSync, hashSync } from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CDM_IMPORT_METADATA_KEY } from '@/constants/cdm-import.constants';
import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';
import { ConflictError, ValidationError } from '@/lib/errors';
import { CredentialService } from '@/services/credentials.service';
import { ProjectImportService } from '@/services/project-import.service';
import { UserAuthenticationMethodService } from '@/services/user-authentication-methods.service';

const accountId = '10000000-0000-4000-8000-000000000020';
const projectId = '10000000-0000-4000-8000-000000000011';
const otherProjectId = '10000000-0000-4000-8000-000000000012';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const tx = {};

/** A hash as Go's x/crypto writes it (`bcrypt.GenerateFromPassword`, DefaultCost). */
const GO_HASH = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';

const NODE_PASSWORD = 'Another-Passw0rd#';
const NODE_HASH = hashSync(NODE_PASSWORD, genSaltSync(4, 'a'));
const OTHER_HASH = hashSync('Third-Passw0rd#', genSaltSync(4, 'a'));

const EMAIL = 'ada@example.test';

const RES_KEY = 'cdm-res-password';
const PERM_KEY = 'cdm-perm-password';
const ROLE_KEY = 'viewer';

interface MethodRow {
  id: string;
  userId: string;
  provider: UserAuthenticationMethodProvider;
  providerId: string;
  providerData: Record<string, unknown>;
  isVerified: boolean;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
}

function loose<T extends object>(defaults: Partial<Record<keyof T, unknown>> = {}): T {
  const cache = new Map<string | symbol, unknown>();
  return new Proxy({} as T, {
    get: (_target, prop) => {
      if (prop === 'then') return undefined;
      if (!cache.has(prop)) {
        cache.set(
          prop,
          vi.fn().mockResolvedValue((defaults as Record<string | symbol, unknown>)[prop] ?? [])
        );
      }
      return cache.get(prop);
    },
    ownKeys: () => [...cache.keys()].filter((key): key is string => typeof key === 'string'),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
}

/** Fails the test on any use: the platform credential tables are not an import's to touch. */
function forbidden<T extends object>(what: string): T {
  return new Proxy({} as T, {
    get: (_target, prop) => {
      if (prop === 'then') return undefined;
      return () => {
        throw new Error(`${what}.${String(prop)} must not be called by an import`);
      };
    },
  });
}

/** In-memory `project_user_credentials`: one live row per `(project, user)`. */
class FakeProjectCredentials {
  rows: Array<CredentialWithHash & { deletedAt: Date | null }> = [];
  reads = { findActive: 0, findActiveMany: 0 };
  private seq = 0;

  private live(project: string, userId: string) {
    return this.rows.find(
      (r) => r.projectId === project && r.userId === userId && r.deletedAt === null
    );
  }

  seed(project: string, userId: string, hash: string, source: CredentialWithHash['source']) {
    this.rows.push({
      id: `cred-${(this.seq += 1)}`,
      scope: 'project',
      projectId: project,
      userId,
      hash,
      source,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  async findActive(scope: { projectId: string }, userId: string) {
    this.reads.findActive += 1;
    const row = this.live(scope.projectId, userId);
    return row ? { ...row } : null;
  }

  async findActiveMany(scope: { projectId: string }, userIds: readonly string[]) {
    this.reads.findActiveMany += 1;
    return this.rows
      .filter(
        (r) => r.projectId === scope.projectId && r.deletedAt === null && userIds.includes(r.userId)
      )
      .map((r) => ({ ...r }));
  }

  async upsert(
    scope: { projectId: string },
    input: { userId: string; hash: string; source: CredentialWithHash['source'] }
  ) {
    const existing = this.live(scope.projectId, input.userId);
    if (existing) {
      Object.assign(existing, { hash: input.hash, source: input.source, updatedAt: new Date() });
    } else {
      this.seed(scope.projectId, input.userId, input.hash, input.source);
    }
    const { hash: _hash, ...record } = this.live(scope.projectId, input.userId)!;
    return record;
  }

  /** The import's write: never replaces a live credential that is not itself an import. */
  async upsertImported(
    scope: { projectId: string },
    input: { userId: string; hash: string; source: CredentialWithHash['source'] }
  ) {
    const existing = this.live(scope.projectId, input.userId);
    if (existing && existing.source !== 'cdm-import') return null;
    return this.upsert(scope, input);
  }

  lockActive = vi.fn();
  touchLastUsed = vi.fn();
  softDelete = vi.fn();
  softDeleteAllForUser = vi.fn();
  listActiveForUser = vi.fn();
  purgeSoftDeleted = vi.fn();

  forProject(project: string) {
    return this.rows.filter((r) => r.projectId === project && r.deletedAt === null);
  }
}

class World {
  methods: MethodRow[] = [];
  users = new Map<string, { id: string; name: string; metadata: Record<string, unknown> }>();
  /** Live members of the importing project. */
  members = new Set<string>();
  calls = { createUser: [] as unknown[], create: [] as unknown[], update: [] as unknown[] };
  readonly credentialRows = new FakeProjectCredentials();
  private seq = 0;

  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}0000000-0000-4000-8000-${String(this.seq).padStart(12, '0')}`;
  }

  /** An existing global identity with an email method (and optionally a project member). */
  seedMethod(
    row: Partial<MethodRow> & { providerId: string },
    options: { cdmProjectId?: string; member?: boolean } = {}
  ): MethodRow {
    const userId = row.userId ?? this.id('9');
    if (options.cdmProjectId) {
      this.users.set(userId, {
        id: userId,
        name: 'Seeded',
        metadata: {
          [CDM_IMPORT_METADATA_KEY]: {
            projectId: options.cdmProjectId,
            kind: 'user',
            externalKey: row.providerId,
          },
        },
      });
    }
    if (options.member) this.members.add(userId);
    const method: MethodRow = {
      id: this.id('8'),
      userId,
      provider: UserAuthenticationMethodProvider.Email,
      providerData: {},
      isVerified: false,
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...row,
    };
    this.methods.push(method);
    return method;
  }

  userIdOf(email: string): string {
    const m = this.methods.find((x) => x.providerId === email);
    if (!m) throw new Error(`no email method for ${email}`);
    return m.userId;
  }

  readonly repository = {
    getUserAuthenticationMethods: vi.fn(async (params: { userId?: string; provider?: string }) =>
      this.methods.filter(
        (m) =>
          (params.userId === undefined || m.userId === params.userId) &&
          (params.provider === undefined || m.provider === params.provider)
      )
    ),
    findByEmail: vi.fn(async (email: string) => {
      const n = email.trim().toLowerCase();
      return (
        this.methods.find(
          (m) => m.provider === UserAuthenticationMethodProvider.Email && m.providerId === n
        ) ??
        // The real lookup falls back to the email an OAuth provider reported.
        this.methods.find((m) => m.providerData.email === n) ??
        null
      );
    }),
    getUserAuthenticationMethod: vi.fn(
      async (id: string) => this.methods.find((m) => m.id === id) ?? null
    ),
    findByProviderAndProviderId: vi.fn(
      async (provider: string, providerId: string) =>
        this.methods.find((m) => m.provider === provider && m.providerId === providerId) ?? null
    ),
    createUserAuthenticationMethod: vi.fn(async (params: Partial<MethodRow>) => {
      this.calls.create.push(JSON.parse(JSON.stringify(params)));
      const row: MethodRow = {
        id: this.id('8'),
        userId: params.userId!,
        provider: params.provider!,
        providerId: params.providerId!,
        providerData: params.providerData ?? {},
        isVerified: params.isVerified ?? false,
        isPrimary: params.isPrimary ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      this.methods.push(row);
      return row;
    }),
    updateUserAuthenticationMethod: vi.fn(
      async (id: string, input: Partial<Pick<MethodRow, 'providerData' | 'isVerified'>>) => {
        this.calls.update.push({ id, input: JSON.parse(JSON.stringify(input)) });
        const row = this.methods.find((m) => m.id === id)!;
        if (input.providerData !== undefined && input.providerData !== null) {
          row.providerData = { ...input.providerData };
        }
        if (input.isVerified !== undefined && input.isVerified !== null) {
          row.isVerified = input.isVerified;
        }
        return row;
      }
    ),
  };

  readonly usersService = {
    createUser: vi.fn(async (input: { name: string; metadata: Record<string, unknown> }) => {
      this.calls.createUser.push(JSON.parse(JSON.stringify(input)));
      const id = this.id('7');
      this.users.set(id, { id, name: input.name, metadata: input.metadata });
      return { id };
    }),
  };

  readonly userRepository = {
    // Every owner of an existing e-mail method is live in these documents.
    findLiveUserCdmMarkers: vi.fn(async () => ({ globalMarker: null, membershipMarker: null })),
    findUserIdByCdmImport: vi.fn(
      async (p: { projectId: string; kind: string; externalKey: string }) => {
        for (const u of this.users.values()) {
          const cdm = u.metadata[CDM_IMPORT_METADATA_KEY] as
            { projectId: string; kind: string; externalKey: string } | undefined;
          if (
            cdm &&
            cdm.projectId === p.projectId &&
            cdm.kind === p.kind &&
            cdm.externalKey === p.externalKey
          ) {
            return u.id;
          }
        }
        return null;
      }
    ),
  };

  /** Membership as the real service gives it: add conflicts when present, filter is one query. */
  readonly projectUsers = {
    addProjectUser: vi.fn(async (params: { projectId: string; userId: string }) => {
      if (this.members.has(params.userId)) throw new ConflictError('already a member');
      this.members.add(params.userId);
      return {};
    }),
    filterMemberUserIds: vi.fn(async (params: { projectId: string; userIds: readonly string[] }) =>
      params.userIds.filter((id) => this.members.has(id))
    ),
    mergeProjectUserCdmMetadata: vi.fn(),
    syncProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
    getProjectUsers: vi.fn().mockResolvedValue([]),
  };

  readonly lockouts = {
    getStatus: vi.fn(),
    recordFailure: vi.fn(),
    reset: vi.fn().mockResolvedValue(undefined),
    resetAllForUser: vi.fn(),
  };

  private static auditLogger() {
    return {
      logCreate: vi.fn(),
      logUpdate: vi.fn(),
      logSoftDelete: vi.fn(),
      logHardDelete: vi.fn(),
      logAction: vi.fn(),
    };
  }

  /** Audit of the credential table, apart from the audit of the authentication methods. */
  readonly audit = World.auditLogger();
  readonly methodAudit = World.auditLogger();

  readonly credentials = new CredentialService(
    {
      platform: forbidden('platform credential repository'),
      project: this.credentialRows as never,
    },
    { platform: forbidden('platform credential audit'), project: this.audit as never },
    this.lockouts as never,
    forbidden('platform credential connection'),
    { publishPasswordSet: vi.fn().mockResolvedValue(undefined) } as never
  );

  readonly authService = new UserAuthenticationMethodService(
    this.repository as never,
    {} as never,
    this.methodAudit as never,
    { publish: vi.fn() } as never,
    this.credentials
  );

  readonly importRepo = loose({ resolvePermission: { id: 'perm-1', resourceId: 'res-1' } });

  importService(): ProjectImportService {
    const importRepo = this.importRepo;
    const cache = {
      permissions: { delete: vi.fn(), keys: vi.fn().mockResolvedValue([]) },
      roles: { delete: vi.fn() },
      groups: { delete: vi.fn() },
      users: { delete: vi.fn() },
      resources: { delete: vi.fn() },
      tags: { delete: vi.fn() },
      apiKeys: { delete: vi.fn() },
    };
    const l = () => loose<never>();
    return new ProjectImportService(
      importRepo as never,
      loose<never>({ createRole: { id: 'role-1' } }), // roles
      l(), // groups
      l(), // roleGroups
      l(), // rolePermissions
      l(), // groupPermissions
      l(), // userPermissions
      l(), // userGroups
      l(), // projectRoles
      l(), // projectGroups
      l(), // projectPermissions
      l(), // projectRolePermissions
      l(), // projectUserPermissions
      l(), // projectUserGroups
      l(), // projectResources
      this.projectUsers as never,
      l(), // userRoles
      l(), // apiKeys
      l(), // projectUserApiKeys
      cache as never,
      l(), // tags
      l(), // projectTags
      l(), // roleTags
      l(), // groupTags
      l(), // userTags
      loose<never>({ createResource: { id: 'imported-res-1', slug: 'documents' } }), // resources
      loose<never>({ createPermission: { id: 'imported-perm-1' } }), // permissions
      this.usersService as never,
      this.authService as never,
      this.userRepository as never,
      l(), // resourceTags
      l(), // permissionTags
      this.credentials,
      loose<never>({ filterTombstoned: new Set() }) // cdmImportTombstones
    );
  }

  async runImport(
    users: CdmDocumentInput['users'],
    options: { strategy?: CdmModeStrategy; scope?: Scope } = {}
  ) {
    const strategy = options.strategy ?? CdmModeStrategy.Merge;
    const useScope = options.scope ?? scope;
    const input: CdmDocumentInput = {
      version: 1,
      id: null,
      mode: {
        strategy,
        onConflict: null,
        confirmDestructive: strategy === CdmModeStrategy.Replace,
      },
      roles: [
        {
          key: ROLE_KEY,
          name: 'Viewer',
          permissions: [PERM_KEY],
          groups: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      users,
      resources: [
        {
          key: RES_KEY,
          slug: 'documents',
          name: 'Documents',
          description: null,
          actions: ['read'],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      permissions: [
        {
          key: PERM_KEY,
          resource: RES_KEY,
          action: 'read',
          name: 'Documents:read',
          description: null,
          condition: null,
          groups: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      groups: [],
      tags: [],
    };
    return this.importService().importProjectCdm(
      { projectId: useScope.id.split(':')[1], scope: useScope, input },
      tx
    );
  }
}

type UserRow = CdmDocumentInput['users'][number];

/** `assigned` gives the row a role, which is what makes the person a member of the project. */
function user(hash: string | null, email = EMAIL, options: { assigned?: boolean } = {}): UserRow {
  return {
    key: { value: email, findBy: CdmFindBy.Email },
    name: 'Ada Lovelace',
    ...(options.assigned === false ? {} : { roles: [ROLE_KEY] }),
    ...(hash === null ? {} : { password: { algorithm: CdmPasswordAlgorithm.Bcrypt, hash } }),
  };
}

const counters = (r: Awaited<ReturnType<World['runImport']>>) => ({
  imported: r.passwordsImported,
  updated: r.passwordsUpdated,
  unchanged: r.passwordsUnchanged,
  skipped: r.passwordsSkippedExisting,
});

const passwordWarnings = (r: { warnings: string[] }) =>
  r.warnings.filter((w) => /password/i.test(w));

const NO_COUNTERS = { imported: 0, updated: 0, unchanged: 0, skipped: 0 };

describe('CDM import writes project-scoped password credentials (ADR 0011 slice 3)', () => {
  let world: World;

  beforeEach(() => {
    vi.clearAllMocks();
    world = new World();
  });

  describe('who gets a credential', () => {
    it('writes the importing project credential for a member this document assigns', async () => {
      const result = await world.runImport([user(GO_HASH)]);

      const userId = world.userIdOf(EMAIL);
      expect(counters(result)).toEqual({ ...NO_COUNTERS, imported: 1 });
      expect(result.usersCreated).toBe(1);
      expect(result.projectUsersEnsured).toBe(1);
      expect(world.credentialRows.forProject(projectId)).toEqual([
        expect.objectContaining({ userId, projectId, source: 'cdm-import', hash: GO_HASH }),
      ]);
      expect(passwordWarnings(result)).toEqual([]);
    });

    it('verifies the imported password afterwards, with the hash stored verbatim', async () => {
      await world.runImport([user(NODE_HASH)]);

      await expect(
        world.credentials.verifyPassword({
          scope: { scope: 'project', projectId },
          userId: world.userIdOf(EMAIL),
          password: NODE_PASSWORD,
        })
      ).resolves.toBe(true);
    });

    it('accepts a password-only row for someone who is already a member', async () => {
      world.seedMethod({ providerId: EMAIL }, { member: true });

      const result = await world.runImport([user(GO_HASH, EMAIL, { assigned: false })]);

      expect(counters(result)).toEqual({ ...NO_COUNTERS, imported: 1 });
      expect(result.usersCreated).toBe(0);
      expect(result.projectUsersEnsured).toBe(0);
      expect(world.credentialRows.forProject(projectId)).toHaveLength(1);
    });

    it('refuses a password for someone who is not a member after the import, writing nothing', async () => {
      const failure = await world
        .runImport([
          user(GO_HASH, 'member@example.test'),
          user(NODE_HASH, 'bystander@example.test', { assigned: false }),
        ])
        .catch((e: unknown) => e);

      expect(failure).toBeInstanceOf(ValidationError);
      const message = (failure as Error).message;
      // The position in the document's users[] (the second), never the address or the hash.
      expect(message).toContain('users[1]');
      expect(message).not.toContain('users[0]');
      expect(message).not.toContain('example.test');
      expect(message).not.toContain('$2');
      expect(world.credentialRows.rows).toEqual([]);
      expect(world.credentialRows.reads).toEqual({ findActive: 0, findActiveMany: 0 });
    });

    it('names the document position even when an earlier row is not a provisioned user', async () => {
      const failure = await world
        .runImport([
          // users[0] is looked up by id, so it is never provisioned: positions must not shift.
          {
            key: { value: '30000000-0000-4000-8000-000000000001', findBy: CdmFindBy.Id },
            name: 'By id',
            roles: [ROLE_KEY],
          },
          user(GO_HASH, 'bystander@example.test', { assigned: false }),
        ])
        .catch((e: unknown) => e);

      expect((failure as Error).message).toContain('users[1]');
    });

    it('does not count a row without a password and never reads membership for it', async () => {
      const result = await world.runImport([user(null, EMAIL, { assigned: false })]);

      expect(result.usersCreated).toBe(1);
      expect(counters(result)).toEqual(NO_COUNTERS);
      expect(world.projectUsers.filterMemberUserIds).not.toHaveBeenCalled();
      expect(world.credentialRows.rows).toEqual([]);
    });

    it('does not exclude a verified identity, and leaves its global fields alone', async () => {
      const method = world.seedMethod({ providerId: EMAIL, isVerified: true });

      const result = await world.runImport([user(GO_HASH)]);

      expect(counters(result)).toEqual({ ...NO_COUNTERS, imported: 1 });
      expect(world.credentialRows.forProject(projectId)).toHaveLength(1);
      expect(method.isVerified).toBe(true);
      expect(method.providerData).toEqual({});
      expect(world.calls.update).toEqual([]);
    });

    it('does not exclude an identity found through GitHub, and gives it a project credential only', async () => {
      const github = world.seedMethod({
        providerId: 'gh-user',
        provider: UserAuthenticationMethodProvider.Github,
        providerData: { email: 'gh@example.test' },
        isVerified: true,
      });

      const result = await world.runImport([user(GO_HASH, 'gh@example.test')]);

      expect(counters(result)).toEqual({ ...NO_COUNTERS, imported: 1 });
      expect(world.credentialRows.forProject(projectId)).toEqual([
        expect.objectContaining({ userId: github.userId, source: 'cdm-import' }),
      ]);
      // The unverified email method that links the address is the only thing added globally.
      expect(world.calls.create).toEqual([
        expect.objectContaining({ provider: 'email', isVerified: false, providerData: {} }),
      ]);
      expect(world.calls.update).toEqual([]);
    });
  });

  describe('provenance inside the project', () => {
    it('replaces an earlier import with a different hash, leaves an identical one, skips an owned one', async () => {
      const replaced = world.seedMethod({ providerId: 'replace@example.test' }, { member: true });
      const same = world.seedMethod({ providerId: 'same@example.test' }, { member: true });
      const owned = world.seedMethod({ providerId: 'owned@example.test' }, { member: true });
      world.credentialRows.seed(projectId, replaced.userId, GO_HASH, 'cdm-import');
      world.credentialRows.seed(projectId, same.userId, NODE_HASH, 'cdm-import');
      world.credentialRows.seed(projectId, owned.userId, GO_HASH, 'reset');

      const result = await world.runImport([
        user(NODE_HASH, 'replace@example.test', { assigned: false }),
        user(NODE_HASH, 'same@example.test', { assigned: false }),
        user(NODE_HASH, 'owned@example.test', { assigned: false }),
        user(GO_HASH, 'fresh@example.test'),
      ]);

      expect(counters(result)).toEqual({ imported: 1, updated: 1, unchanged: 1, skipped: 1 });
      const byUser = new Map(world.credentialRows.forProject(projectId).map((r) => [r.userId, r]));
      expect(byUser.get(replaced.userId)).toMatchObject({ hash: NODE_HASH, source: 'cdm-import' });
      expect(byUser.get(same.userId)).toMatchObject({ hash: NODE_HASH, source: 'cdm-import' });
      expect(byUser.get(owned.userId)).toMatchObject({ hash: GO_HASH, source: 'reset' });
    });

    it.each(['reset', 'change'] as const)(
      'treats a credential the person set (%s) as theirs, on every later import',
      async (source) => {
        const member = world.seedMethod({ providerId: EMAIL }, { member: true });
        world.credentialRows.seed(projectId, member.userId, GO_HASH, source);

        const first = await world.runImport([user(NODE_HASH, EMAIL, { assigned: false })]);
        const second = await world.runImport([user(OTHER_HASH, EMAIL, { assigned: false })]);

        expect(counters(first)).toEqual({ ...NO_COUNTERS, skipped: 1 });
        expect(counters(second)).toEqual({ ...NO_COUNTERS, skipped: 1 });
        expect(world.credentialRows.forProject(projectId)[0]).toMatchObject({
          hash: GO_HASH,
          source,
        });
      }
    );

    it('is idempotent: importing the same document twice writes once, then reports unchanged', async () => {
      const first = await world.runImport([user(GO_HASH)]);
      const second = await world.runImport([user(GO_HASH)]);

      expect(counters(first)).toEqual({ ...NO_COUNTERS, imported: 1 });
      expect(counters(second)).toEqual({ ...NO_COUNTERS, unchanged: 1 });
      expect(world.credentialRows.forProject(projectId)).toHaveLength(1);
    });

    it('keeps a credential when the document no longer carries a password, in replace mode too', async () => {
      const member = world.seedMethod({ providerId: EMAIL }, { member: true });
      world.credentialRows.seed(projectId, member.userId, GO_HASH, 'cdm-import');
      const before = JSON.stringify(world.credentialRows.rows);

      const merge = await world.runImport([user(null, EMAIL, { assigned: false })]);
      const replace = await world.runImport([user(null, EMAIL, { assigned: false })], {
        strategy: CdmModeStrategy.Replace,
      });

      expect(counters(merge)).toEqual(NO_COUNTERS);
      expect(counters(replace)).toEqual(NO_COUNTERS);
      expect(JSON.stringify(world.credentialRows.rows)).toBe(before);
      expect(world.credentialRows.softDelete).not.toHaveBeenCalled();
      expect(world.credentialRows.softDeleteAllForUser).not.toHaveBeenCalled();
    });

    it("never reads or writes another project's credential for the same person", async () => {
      const member = world.seedMethod({ providerId: EMAIL }, { member: true });
      world.credentialRows.seed(otherProjectId, member.userId, GO_HASH, 'reset');
      const otherBefore = { ...world.credentialRows.forProject(otherProjectId)[0] };

      const result = await world.runImport([user(NODE_HASH, EMAIL, { assigned: false })]);

      // The other project's owned credential does not make this project's "existing".
      expect(counters(result)).toEqual({ ...NO_COUNTERS, imported: 1 });
      expect(world.credentialRows.forProject(otherProjectId)).toEqual([otherBefore]);
      expect(world.credentialRows.forProject(projectId)).toEqual([
        expect.objectContaining({ hash: NODE_HASH, source: 'cdm-import' }),
      ]);
    });

    it('imports into the project the scope names, not another', async () => {
      const otherScope: Scope = {
        tenant: Tenant.AccountProject,
        id: `${accountId}:${otherProjectId}`,
      };

      await world.runImport([user(GO_HASH)], { scope: otherScope });

      expect(world.credentialRows.forProject(projectId)).toEqual([]);
      expect(world.credentialRows.forProject(otherProjectId)).toHaveLength(1);
    });
  });

  describe('cost: one lookup, not one per row', () => {
    it('reads membership once and credentials once for a document of many rows', async () => {
      const rows: UserRow[] = [];
      for (let i = 0; i < 25; i += 1) {
        const email = `bulk-${i}@example.test`;
        if (i % 5 === 0) {
          const existing = world.seedMethod({ providerId: email }, { member: true });
          world.credentialRows.seed(projectId, existing.userId, GO_HASH, 'cdm-import');
          rows.push(user(i % 10 === 0 ? NODE_HASH : GO_HASH, email, { assigned: false }));
        } else {
          rows.push(user(GO_HASH, email));
        }
      }
      world.credentialRows.reads = { findActive: 0, findActiveMany: 0 };

      const result = await world.runImport(rows);

      expect(world.projectUsers.filterMemberUserIds).toHaveBeenCalledTimes(1);
      expect(world.projectUsers.filterMemberUserIds.mock.calls[0][0].userIds).toHaveLength(25);
      expect(world.credentialRows.reads).toEqual({ findActive: 0, findActiveMany: 1 });
      expect(counters(result)).toEqual({ imported: 20, updated: 3, unchanged: 2, skipped: 0 });
    });
  });

  describe('what never happens', () => {
    it('never writes a hash or a marker into the Email method, nor into an audit row', async () => {
      world.seedMethod({ providerId: EMAIL, isVerified: true }, { cdmProjectId: projectId });
      world.seedMethod({ providerId: 'unverified@example.test' }, { cdmProjectId: projectId });

      await world.runImport([
        user(GO_HASH),
        user(NODE_HASH, 'unverified@example.test'),
        user(OTHER_HASH, 'fresh@example.test'),
      ]);

      for (const method of world.methods) {
        expect(JSON.stringify(method.providerData)).not.toContain('hashedPassword');
        expect(JSON.stringify(method.providerData)).not.toContain('passwordSource');
        expect(JSON.stringify(method.providerData)).not.toContain('$2');
      }
      expect(JSON.stringify(world.calls.create)).not.toContain('$2');
      expect(JSON.stringify(world.calls.update)).not.toContain('$2');
      expect(JSON.stringify(world.calls.createUser)).not.toContain('$2');
      expect(world.audit.logCreate).toHaveBeenCalledTimes(3);
      const auditRows = JSON.stringify([
        ...world.audit.logCreate.mock.calls,
        ...world.audit.logUpdate.mock.calls,
      ]);
      expect(auditRows).not.toContain('$2');
    });

    it('no longer warns that passwords were ignored, or moves any other result field for them', async () => {
      const result = await world.runImport([user(GO_HASH), user(NODE_HASH, 'grace@example.test')]);

      expect(passwordWarnings(result)).toEqual([]);
      expect(counters(result)).toEqual({ ...NO_COUNTERS, imported: 2 });
    });

    it('still rejects a password that is not a valid bcrypt hash, before anything is written', async () => {
      await expect(world.runImport([user('not-a-bcrypt-hash')])).rejects.toThrow();
      expect(world.methods).toHaveLength(0);
      expect(world.credentialRows.rows).toEqual([]);
    });

    it('keeps a password on a non-email user a validation error', async () => {
      await expect(
        world.runImport([
          {
            key: { value: 'legacy-1', findBy: CdmFindBy.Key },
            name: 'Legacy',
            roles: [ROLE_KEY],
            password: { algorithm: CdmPasswordAlgorithm.Bcrypt, hash: GO_HASH },
          },
        ])
      ).rejects.toThrow(/only allowed/);
    });
  });
});
