/**
 * CDM import with a `password` after ADR 0011 slice 2, end to end below the transport.
 *
 * The real `ProjectImportService` with the default entity registry runs against in-memory
 * authentication methods and a credential service that fails the test if it is called. The
 * v1.16.0 global slot (`providerData.hashedPassword` + `passwordSource`) is gone and the
 * project credential that replaces it lands in the next slice, so in this slice an import
 * validates a password and then ignores it, with a warning. Nothing is written anywhere.
 */
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
import { ProjectImportService } from '@/services/project-import.service';
import { UserAuthenticationMethodService } from '@/services/user-authentication-methods.service';

const accountId = '10000000-0000-4000-8000-000000000020';
const projectId = '10000000-0000-4000-8000-000000000011';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const tx = {};

/** A hash as Go's x/crypto writes it (`bcrypt.GenerateFromPassword`, DefaultCost). */
const GO_HASH = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';

const NODE_PASSWORD = 'Another-Passw0rd#';
const NODE_HASH = hashSync(NODE_PASSWORD, genSaltSync(10, 'a'));

const EMAIL = 'ada@example.test';

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

class World {
  methods: MethodRow[] = [];
  users = new Map<string, { id: string; name: string; metadata: Record<string, unknown> }>();
  calls = { createUser: [] as unknown[], create: [] as unknown[], update: [] as unknown[] };
  private seq = 0;

  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}0000000-0000-4000-8000-${String(this.seq).padStart(12, '0')}`;
  }

  seedMethod(row: Partial<MethodRow> & { providerId: string }, cdmProjectId?: string): MethodRow {
    const userId = row.userId ?? this.id('9');
    if (cdmProjectId) {
      this.users.set(userId, {
        id: userId,
        name: 'Seeded',
        metadata: {
          [CDM_IMPORT_METADATA_KEY]: {
            projectId: cdmProjectId,
            kind: 'user',
            externalKey: row.providerId,
          },
        },
      });
    }
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

  get email(): MethodRow {
    const m = this.methods.find((x) => x.providerId === EMAIL);
    if (!m) throw new Error('no email method');
    return m;
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

  /** An import must not write any credential in this slice: every method fails the test. */
  readonly credentials = {
    setPassword: vi.fn(),
    setPasswordHash: vi.fn(),
    removeCredential: vi.fn(),
    hasCredential: vi.fn().mockResolvedValue(false),
  };

  readonly authService = new UserAuthenticationMethodService(
    this.repository as never,
    {} as never,
    {
      logCreate: vi.fn(),
      logUpdate: vi.fn(),
      logSoftDelete: vi.fn(),
      logHardDelete: vi.fn(),
      logAction: vi.fn(),
    } as never,
    { publish: vi.fn() } as never,
    this.credentials as never
  );

  readonly importRepo = loose({ resolvePermission: { id: 'p', resourceId: 'r' } });

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
      l(), // roles
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
      loose({ getProjectUsers: [] }) as never, // projectUsers
      l(), // userRoles
      l(), // apiKeys
      l(), // projectUserApiKeys
      cache as never,
      l(), // tags
      l(), // projectTags
      l(), // roleTags
      l(), // groupTags
      l(), // userTags
      l(), // resources
      l(), // permissions
      this.usersService as never,
      this.authService as never,
      this.userRepository as never,
      l(), // resourceTags
      l() // permissionTags
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
      roles: [],
      users,
    };
    return this.importService().importProjectCdm(
      { projectId: useScope.id.split(':')[1], scope: useScope, input },
      tx
    );
  }
}

function userWithPassword(hash: string | null, email = EMAIL): CdmDocumentInput['users'][number] {
  return {
    key: { value: email, findBy: CdmFindBy.Email },
    name: 'Ada Lovelace',
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

describe('CDM import with a password (ADR 0011 slice 2: validated, then ignored)', () => {
  let world: World;

  beforeEach(() => {
    vi.clearAllMocks();
    world = new World();
  });

  it('provisions the identity without any password, warns, and moves no counter', async () => {
    const result = await world.runImport([userWithPassword(GO_HASH)]);

    expect(counters(result)).toEqual(NO_COUNTERS);
    expect(result.usersCreated).toBe(1);
    expect(world.email.providerData).toEqual({});
    expect(world.email.isVerified).toBe(false);
    expect(passwordWarnings(result)).toEqual([
      expect.stringContaining('1 password(s) were not imported'),
    ]);
    expect(world.credentials.setPassword).not.toHaveBeenCalled();
    expect(world.credentials.setPasswordHash).not.toHaveBeenCalled();
  });

  it('never carries a hash or a marker into the Email method, for any identity', async () => {
    world.seedMethod({ providerId: EMAIL, isVerified: true }, projectId);
    world.seedMethod({ providerId: 'unverified@example.test', isVerified: false }, projectId);
    world.seedMethod({
      providerId: 'someone',
      provider: UserAuthenticationMethodProvider.Github,
      providerData: { email: 'gh@example.test' },
    });

    await world.runImport([
      userWithPassword(GO_HASH),
      userWithPassword(NODE_HASH, 'unverified@example.test'),
      userWithPassword(GO_HASH, 'gh@example.test'),
    ]);

    for (const method of world.methods) {
      expect(JSON.stringify(method.providerData)).not.toContain('hashedPassword');
      expect(JSON.stringify(method.providerData)).not.toContain('passwordSource');
      expect(JSON.stringify(method.providerData)).not.toContain('$2');
    }
    expect(world.calls.update).toEqual([]);
    expect(JSON.stringify(world.calls.create)).not.toContain('$2');
  });

  it('counts every ignored password in one warning, across all rows', async () => {
    const result = await world.runImport([
      userWithPassword(GO_HASH),
      userWithPassword(NODE_HASH, 'grace@example.test'),
      userWithPassword(null, 'no-password@example.test'),
    ]);

    expect(passwordWarnings(result)).toEqual([
      expect.stringContaining('2 password(s) were not imported'),
    ]);
    expect(counters(result)).toEqual(NO_COUNTERS);
  });

  it('does not warn for a document without passwords', async () => {
    const result = await world.runImport([userWithPassword(null)]);
    expect(passwordWarnings(result)).toEqual([]);
    expect(result.usersCreated).toBe(1);
  });

  it('still rejects a password that is not a valid bcrypt hash, so a bad document fails as before', async () => {
    await expect(world.runImport([userWithPassword('not-a-bcrypt-hash')])).rejects.toThrow();
    expect(world.methods).toHaveLength(0);
  });

  it('does not delete or alter anything a user already has, in replace mode either', async () => {
    const existing = world.seedMethod({ providerId: EMAIL, isVerified: true }, projectId);
    const before = JSON.stringify(existing);

    await world.runImport([userWithPassword(GO_HASH)], { strategy: CdmModeStrategy.Replace });

    expect(JSON.stringify(world.email)).toBe(before);
    expect(world.credentials.removeCredential).not.toHaveBeenCalled();
  });
});
