/**
 * CDM import of bcrypt password hashes (ADR 0010, including the amendment on org-scoped
 * eligibility and conflict handling), end to end below the transport.
 *
 * The real `ProjectImportService` with the default entity registry runs against an
 * in-memory credential store, and that store is also what the real
 * `UserAuthenticationMethodService` and the real `AuthHandler.login` read, so what is
 * asserted is the thing that matters: the hash an import writes is the hash platform login
 * verifies, and a password set in Grant is not an import's to overwrite.
 */
import {
  AccountType,
  CdmFindBy,
  CdmModeStrategy,
  CdmPasswordAlgorithm,
  type Scope,
  Tenant,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { genSaltSync, hashSync } from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CDM_IMPORT_METADATA_KEY,
  PASSWORD_CONFLICT_PROVIDER_DATA_KEY,
  PASSWORD_SOURCE_CDM_IMPORT,
  PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY,
  PASSWORD_SOURCE_PROVIDER_DATA_KEY,
} from '@/constants/cdm-import.constants';
import { AuthHandler } from '@/handlers/auth.handler';
import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';
import { isConfinedToOrganization } from '@/lib/cdm/cdm-org-confinement.lib';
import { AuthenticationError } from '@/lib/errors';
import { ProjectImportService } from '@/services/project-import.service';
import { UserAuthenticationMethodService } from '@/services/user-authentication-methods.service';

const accountId = '10000000-0000-4000-8000-000000000020';
/** Two environments of one organization (A), and a project of another organization (B). */
const projectId = '10000000-0000-4000-8000-000000000011';
const otherProjectId = '10000000-0000-4000-8000-000000000012';
const foreignProjectId = '10000000-0000-4000-8000-000000000013';
const orgA = '10000000-0000-4000-8000-0000000000a1';
const orgB = '10000000-0000-4000-8000-0000000000b1';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const otherScope: Scope = {
  tenant: Tenant.AccountProject,
  id: `${accountId}:${otherProjectId}`,
};
const tx = {};

/** `bcrypt.GenerateFromPassword([]byte("Legacy-Passw0rd!"), bcrypt.DefaultCost)` from Go's x/crypto. */
const GO_PASSWORD = 'Legacy-Passw0rd!';
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
  calls = {
    createUser: [] as unknown[],
    create: [] as unknown[],
    update: [] as unknown[],
    identityLookups: [] as Array<{ projectId: string; emails: string[] }>,
  };
  /** `organization_projects`: the organizations each project belongs to. */
  projectOrganizations = new Map<string, string[]>([
    [projectId, [orgA]],
    [otherProjectId, [orgA]],
    [foreignProjectId, [orgB]],
  ]);
  /** `project_users` and `organization_users` (active rows only). */
  projectMemberships: Array<{ userId: string; projectId: string }> = [];
  organizationMemberships: Array<{ userId: string; organizationId: string }> = [];
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

  /** What the import's user-assignment step commits: the user is a member of the project. */
  addProjectMembership(userId: string, forProjectId: string): void {
    this.projectMemberships.push({ userId, projectId: forProjectId });
  }

  addOrganizationMembership(userId: string, organizationId: string): void {
    this.organizationMemberships.push({ userId, organizationId });
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
    /**
     * The batched lookup the entity uses. The membership facts are what the real repository
     * reads across tenants; the decision is the real `isConfinedToOrganization`.
     */
    findCdmPasswordIdentities: vi.fn(async (p: { projectId: string; emails: string[] }) => {
      this.calls.identityLookups.push({ projectId: p.projectId, emails: [...p.emails] });
      const wanted = new Set(p.emails.map((email) => email.trim().toLowerCase()));
      const orgs = this.projectOrganizations.get(p.projectId) ?? [];
      const importingOrganizationId = orgs.length === 1 ? orgs[0] : null;
      return this.methods
        .filter(
          (m) =>
            m.provider === UserAuthenticationMethodProvider.Email &&
            wanted.has(m.providerId.toLowerCase())
        )
        .map((m) => {
          const cdm = this.users.get(m.userId)?.metadata[CDM_IMPORT_METADATA_KEY] as
            { projectId?: string; kind?: string; externalKey?: string } | undefined;
          return {
            methodId: m.id,
            userId: m.userId,
            providerId: m.providerId,
            hasOAuthMethod: this.methods.some(
              (other) =>
                other.userId === m.userId &&
                other.provider !== UserAuthenticationMethodProvider.Email
            ),
            confinedToImportingOrganization:
              importingOrganizationId !== null &&
              isConfinedToOrganization(
                {
                  projectOrganizationIds: this.projectMemberships
                    .filter((pm) => pm.userId === m.userId)
                    .map((pm) => this.projectOrganizations.get(pm.projectId) ?? []),
                  organizationIds: this.organizationMemberships
                    .filter((om) => om.userId === m.userId)
                    .map((om) => om.organizationId),
                },
                importingOrganizationId
              ),
            cdmImport: cdm
              ? {
                  projectId: cdm.projectId ?? null,
                  kind: cdm.kind ?? null,
                  externalKey: cdm.externalKey ?? null,
                }
              : null,
          };
        });
    }),
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
    { publish: vi.fn() } as never
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
    const importingProjectId = useScope.id.split(':')[1];
    const result = await this.importService().importProjectCdm(
      { projectId: importingProjectId, scope: useScope, input },
      tx
    );
    // The import's user-assignment step makes every user of the document a member of the
    // importing project (the entity under test runs before it, so the lookup never sees it).
    for (const user of users ?? []) {
      const email = user.key.value;
      const method = this.methods.find(
        (m) =>
          m.provider === UserAuthenticationMethodProvider.Email &&
          m.providerId.toLowerCase() === email.toLowerCase()
      );
      if (
        method &&
        !this.projectMemberships.some(
          (pm) => pm.userId === method.userId && pm.projectId === importingProjectId
        )
      ) {
        this.addProjectMembership(method.userId, importingProjectId);
      }
    }
    return result;
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
  conflict: r.passwordsSkippedConflict,
});

/** The real magic-link resolution (`project-oauth.handler` calls it), which verifies the address. */
async function verifyThroughMagicLink(world: World, email: string) {
  const handler = new AuthHandler(
    world.authService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { withTransaction: (fn: (t: unknown) => unknown) => fn(tx) } as never
  );
  return handler.resolveUserIdFromEmailForProject(email, tx as never);
}

async function loginWith(world: World, email: string, password: string) {
  const mockUsers = {
    getUsers: vi.fn().mockResolvedValue({
      totalCount: 1,
      users: [
        { id: world.email.userId, accounts: [{ id: 'account-1', type: AccountType.Personal }] },
      ],
    }),
    createUser: vi.fn(),
    countHumanUsers: vi.fn(),
  };
  const mockUserSessions = {
    getUserSessions: vi.fn().mockResolvedValue({ userSessions: [] }),
    createSession: vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
    refreshSessionLastUsed: vi.fn(),
    signSession: vi.fn(),
  };
  const handler = new AuthHandler(
    world.authService as never,
    mockUsers as never,
    {} as never,
    {} as never,
    {} as never,
    { hasActiveMfaEnrollment: vi.fn().mockResolvedValue(false) } as never,
    mockUserSessions as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { withTransaction: (fn: (t: unknown) => unknown) => fn(tx) } as never
  );
  return handler.login({
    input: {
      provider: UserAuthenticationMethodProvider.Email,
      providerId: email,
      providerData: { password, action: UserAuthenticationEmailProviderAction.Login },
    },
  });
}

describe('CDM import of bcrypt password hashes (ADR 0010)', () => {
  let world: World;

  beforeEach(() => {
    vi.clearAllMocks();
    world = new World();
  });

  describe('first import', () => {
    it('stores the hash where platform login reads it, marked as imported, and login succeeds with the original plaintext', async () => {
      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 1,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({
        hashedPassword: GO_HASH,
        [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
        [PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY]: projectId,
      });
      expect(world.email.isVerified).toBe(false);

      // The Go-generated `$2a$10$` hash verifies with node bcrypt through the unchanged login.
      const session = await loginWith(world, EMAIL, GO_PASSWORD);
      expect(session.accessToken).toBe('access');
      expect(session.requiresEmailVerification).toBe(true);

      await expect(loginWith(world, EMAIL, `${GO_PASSWORD}x`)).rejects.toBeInstanceOf(
        AuthenticationError
      );
    });

    it('accepts a node-generated $2a$ hash the same way', async () => {
      expect(NODE_HASH.startsWith('$2a$10$')).toBe(true);
      await world.runImport([userWithPassword(NODE_HASH)]);

      const session = await loginWith(world, EMAIL, NODE_PASSWORD);
      expect(session.accessToken).toBe('access');
    });

    it('creates a passwordless identity when the document carries no password', async () => {
      const result = await world.runImport([userWithPassword(null)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({});
      await expect(loginWith(world, EMAIL, GO_PASSWORD)).rejects.toBeInstanceOf(
        AuthenticationError
      );
    });

    it('writes the hash to the credential store and nowhere else', async () => {
      const result = await world.runImport([
        { ...userWithPassword(GO_HASH), metadata: { legacy: { id: '7' } }, searchable: { n: 1 } },
      ]);

      const elsewhere = JSON.stringify({
        createUser: world.calls.createUser,
        userMetadata: [...world.users.values()],
        warnings: result.warnings,
        result,
      });
      expect(elsewhere).not.toContain(GO_HASH);
      // The one place it is: the create call for the email method (never audited with it).
      expect(JSON.stringify(world.calls.create)).toContain(GO_HASH);
    });
  });

  describe('re-import', () => {
    it('leaves an identical hash alone', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);
      world.calls.update.length = 0;

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 1,
        skipped: 0,
        conflict: 0,
      });
      expect(world.calls.update).toEqual([]);
    });

    it('replaces an imported credential when the legacy hash changed', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);

      const result = await world.runImport([userWithPassword(NODE_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 1,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({
        hashedPassword: NODE_HASH,
        [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
        [PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY]: projectId,
      });
      expect((await loginWith(world, EMAIL, NODE_PASSWORD)).accessToken).toBe('access');
      await expect(loginWith(world, EMAIL, GO_PASSWORD)).rejects.toBeInstanceOf(
        AuthenticationError
      );
    });

    it('adds a credential to an identity an earlier import of this project created without one', async () => {
      await world.runImport([userWithPassword(null)]);

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 1,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
      expect((await loginWith(world, EMAIL, GO_PASSWORD)).accessToken).toBe('access');
    });

    it('never deletes a credential: an absent password field leaves it as it is', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);
      world.calls.update.length = 0;

      const result = await world.runImport([userWithPassword(null)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
      expect(world.calls.update).toEqual([]);
      expect(world.email.providerData.hashedPassword).toBe(GO_HASH);
    });
  });

  describe('verification is the handover to Grant', () => {
    it('does not replace an import-marked credential once the address is verified', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);
      world.email.isVerified = true;
      expect(world.email.providerData[PASSWORD_SOURCE_PROVIDER_DATA_KEY]).toBe(
        PASSWORD_SOURCE_CDM_IMPORT
      );
      world.calls.update.length = 0;

      const result = await world.runImport([userWithPassword(NODE_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.calls.update).toEqual([]);
      expect(world.email.providerData.hashedPassword).toBe(GO_HASH);
      expect((await loginWith(world, EMAIL, GO_PASSWORD)).accessToken).toBe('access');
      await expect(loginWith(world, EMAIL, NODE_PASSWORD)).rejects.toBeInstanceOf(
        AuthenticationError
      );
    });

    it('counts an identical hash on a verified method as skipped, and writes nothing', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);
      world.email.isVerified = true;
      world.calls.update.length = 0;

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.calls.update).toEqual([]);
    });

    it('stops replacing after the magic link verifies the address', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);

      // Unverified: still the legacy system's to update.
      const before = await world.runImport([userWithPassword(NODE_HASH)]);
      expect(counters(before)).toEqual({
        imported: 0,
        updated: 1,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });

      await verifyThroughMagicLink(world, EMAIL);
      expect(world.email.isVerified).toBe(true);
      expect(world.email.providerData[PASSWORD_SOURCE_PROVIDER_DATA_KEY]).toBe(
        PASSWORD_SOURCE_CDM_IMPORT
      );

      const after = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(after)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData.hashedPassword).toBe(NODE_HASH);
    });

    it('does not add a credential to a verified identity either', async () => {
      await world.runImport([userWithPassword(null)]);
      await verifyThroughMagicLink(world, EMAIL);

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({});
    });
  });

  describe('a password set in Grant is Grant-owned from then on', () => {
    async function importedThen(change: (w: World, userId: string) => Promise<void>) {
      await world.runImport([userWithPassword(GO_HASH)]);
      const { userId } = world.email;
      await change(world, userId);
      const afterChange = { ...world.email.providerData };

      const result = await world.runImport([userWithPassword(NODE_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual(afterChange);
      expect(world.email.providerData.hashedPassword).not.toBe(NODE_HASH);
      expect(result.warnings.join('\n')).not.toContain(NODE_HASH);
    }

    it('changePassword clears the marker, and the next import does not overwrite', async () => {
      await importedThen(async (w, userId) => {
        await w.authService.changePassword(userId, GO_PASSWORD, 'Grant-Side-Passw0rd!');
        expect(w.email.providerData[PASSWORD_SOURCE_PROVIDER_DATA_KEY]).toBeUndefined();
        expect(w.email.providerData.hashedPassword).not.toBe(GO_HASH);
      });
    });

    it('resetPassword clears the marker, and the next import does not overwrite', async () => {
      await importedThen(async (w) => {
        w.email.providerData = {
          ...w.email.providerData,
          passwordResetOtp: { token: 'reset-token', validUntil: Date.now() + 60_000 },
        };
        const reset = await w.authService.resetPassword('reset-token', 'Reset-Passw0rd!');
        expect(reset).toBe(w.email.userId);
        expect(w.email.providerData[PASSWORD_SOURCE_PROVIDER_DATA_KEY]).toBeUndefined();
      });
    });

    it('a password with no marker (set in Grant before any import) is never overwritten', async () => {
      world.seedMethod(
        {
          providerId: EMAIL,
          providerData: { hashedPassword: hashSync('Grant-Passw0rd!', 4) },
        },
        projectId
      );
      const before = { ...world.email.providerData };

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual(before);
    });
  });

  describe('replace mode', () => {
    it('keeps the credential of a user it re-creates, and tears down no authentication method', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);
      world.calls.update.length = 0;
      world.calls.create.length = 0;

      const same = await world.runImport([userWithPassword(GO_HASH)], {
        strategy: CdmModeStrategy.Replace,
      });
      const absent = await world.runImport([userWithPassword(null)], {
        strategy: CdmModeStrategy.Replace,
      });
      const dropped = await world.runImport([], { strategy: CdmModeStrategy.Replace });

      expect(counters(same)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 1,
        skipped: 0,
        conflict: 0,
      });
      expect(counters(absent)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
      expect(counters(dropped)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
      expect(world.calls.update).toEqual([]);
      expect(world.calls.create).toEqual([]);
      expect(world.methods).toHaveLength(1);
      // The replace teardown ran (it asked the repository what to remove) and none of what it
      // asked about is a user or an authentication method.
      const teardownCalls = Object.keys(world.importRepo as object).length;
      expect(teardownCalls).toBeGreaterThan(0);
      expect(
        Object.keys(world.importRepo as object).filter((name) =>
          /user(?!.*(Tag|Group|Permission|ApiKey|Role))|authentication/i.test(name)
        )
      ).toEqual([]);
      expect(world.email.providerData.hashedPassword).toBe(GO_HASH);
      expect((await loginWith(world, EMAIL, GO_PASSWORD)).accessToken).toBe('access');
    });

    it('can still replace an imported credential with a changed hash', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);

      const result = await world.runImport([userWithPassword(NODE_HASH)], {
        strategy: CdmModeStrategy.Replace,
      });

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 1,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
    });
  });

  describe('identities that are not this import to write', () => {
    it('does not put a password on a user who registered in Grant (verified, passwordless)', async () => {
      world.seedMethod({ providerId: EMAIL, isVerified: true });

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({});
      expect(result.warnings.join('\n')).toMatch(/passwordsSkippedExisting/);
      expect(result.warnings.join('\n')).not.toContain(EMAIL);
    });

    it('does not put a password on an unverified passwordless user that no import of this project created', async () => {
      world.seedMethod({ providerId: EMAIL, isVerified: false });

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({});
    });

    it('does not put a password on a user known only through GitHub or Google', async () => {
      const oauthData = { email: EMAIL, emailVerified: true };
      for (const provider of [
        UserAuthenticationMethodProvider.Github,
        UserAuthenticationMethodProvider.Google,
      ]) {
        world = new World();
        const oauth = world.seedMethod({
          provider,
          providerId: '4242',
          providerData: { ...oauthData },
          isVerified: true,
        });
        // Even confined to the importing organization: an OAuth identity is a real account.
        world.addProjectMembership(oauth.userId, otherProjectId);

        const result = await world.runImport([userWithPassword(GO_HASH)]);

        expect(counters(result)).toEqual({
          imported: 0,
          updated: 0,
          unchanged: 0,
          skipped: 1,
          conflict: 0,
        });
        // Nothing was written to the OAuth identity, and no hash exists anywhere in the store.
        expect(oauth.providerData).toEqual(oauthData);
        expect(world.calls.update).toEqual([]);
        expect(JSON.stringify(world.methods)).not.toContain(GO_HASH);
        const created = world.methods.find(
          (m) => m.provider === UserAuthenticationMethodProvider.Email
        );
        expect(created?.providerData ?? {}).toEqual({});

        // The next import now finds the passwordless Email method the first one added beside
        // the OAuth identity. The user is confined to the organization, but still a real
        // account that signs in elsewhere, so the credential is still not written.
        const again = await world.runImport([userWithPassword(GO_HASH)]);

        expect(counters(again)).toEqual({
          imported: 0,
          updated: 0,
          unchanged: 0,
          skipped: 1,
          conflict: 0,
        });
        expect(JSON.stringify(world.methods)).not.toContain(GO_HASH);
        expect(world.calls.update).toEqual([]);
      }
    });
  });

  describe('org-confined eligibility (ADR 0010, Amendment)', () => {
    /** An identity an earlier import of the sibling project created and put in that project. */
    function siblingIdentity(row: Partial<MethodRow> = {}): MethodRow {
      const method = world.seedMethod({ providerId: EMAIL, ...row }, otherProjectId);
      world.addProjectMembership(method.userId, otherProjectId);
      return method;
    }

    it('imports onto an unverified passwordless identity an older import of a sibling project created', async () => {
      const sibling = siblingIdentity();

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 1,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
      expect(world.email.userId).toBe(sibling.userId);
      expect(world.email.providerData).toEqual({
        hashedPassword: GO_HASH,
        [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
        [PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY]: projectId,
      });
      expect(world.email.isVerified).toBe(false);
      expect((await loginWith(world, EMAIL, GO_PASSWORD)).accessToken).toBe('access');
    });

    it('imports onto a user whose only membership is an organization membership of the importing organization', async () => {
      const method = world.seedMethod({ providerId: EMAIL });
      world.addOrganizationMembership(method.userId, orgA);

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 1,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
    });

    it('skips an identity with a project membership in another organization', async () => {
      const sibling = siblingIdentity();
      world.addProjectMembership(sibling.userId, foreignProjectId);

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({});
      expect(world.calls.update).toEqual([]);
      expect(result.warnings.join('\n')).toMatch(/passwordsSkippedExisting/);
    });

    it('skips an identity with an organization membership in another organization', async () => {
      const sibling = siblingIdentity();
      world.addOrganizationMembership(sibling.userId, orgB);

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({});
    });

    it('skips an identity that is a member of a project that belongs to no organization', async () => {
      const sibling = siblingIdentity();
      const orphanProject = '10000000-0000-4000-8000-000000000014';
      world.projectOrganizations.set(orphanProject, []);
      world.addProjectMembership(sibling.userId, orphanProject);

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
    });

    it('skips an identity with no membership at all when no import of this project created it', async () => {
      world.seedMethod({ providerId: EMAIL });

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
    });

    it('keeps an identity this project created eligible on its own, whatever else it joined', async () => {
      const own = world.seedMethod({ providerId: EMAIL }, projectId);
      world.addProjectMembership(own.userId, foreignProjectId);

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 1,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
    });

    it.each([
      ['no organization', [] as string[]],
      ['two organizations', [orgA, orgB]],
    ])('confines nothing when the importing project belongs to %s', async (_label, orgs) => {
      siblingIdentity();
      world.projectOrganizations.set(projectId, orgs);

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({});
    });

    it('does not write onto a different address that the fuzzy lookup happened to match', async () => {
      // The real lookup matches with ILIKE, so `_` in an imported address is a wildcard.
      const sibling = siblingIdentity({ providerId: 'axb@example.test' });
      world.repository.findByEmail.mockResolvedValueOnce(sibling);

      const result = await world.runImport([userWithPassword(GO_HASH, 'a_b@example.test')]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(sibling.providerData).toEqual({});
    });

    it('never writes onto a verified method, even a confined one', async () => {
      siblingIdentity({ isVerified: true });

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({});
    });

    it('never overwrites a credential set in Grant (no marker), even on a confined identity', async () => {
      const grantHash = hashSync('Grant-Passw0rd!', 4);
      siblingIdentity({ providerData: { hashedPassword: grantHash } });

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.email.providerData).toEqual({ hashedPassword: grantHash });
    });

    it('never deletes anything when the document carries no password for a confined identity', async () => {
      siblingIdentity({
        providerData: {
          hashedPassword: GO_HASH,
          [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
          [PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY]: otherProjectId,
        },
      });

      const result = await world.runImport([userWithPassword(null)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });
      expect(world.calls.update).toEqual([]);
      expect(world.email.providerData.hashedPassword).toBe(GO_HASH);
    });
  });

  describe('several environments of one organization (conflict handling)', () => {
    const tombstone = {
      [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
      [PASSWORD_CONFLICT_PROVIDER_DATA_KEY]: true,
    };

    it('another project sending the same hash changes nothing', async () => {
      await world.runImport([userWithPassword(GO_HASH)], { scope: otherScope });
      world.calls.update.length = 0;

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 1,
        skipped: 0,
        conflict: 0,
      });
      expect(world.calls.update).toEqual([]);
      expect(world.email.providerData[PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY]).toBe(
        otherProjectId
      );
    });

    it('another project sending a different hash leaves a tombstone and no password', async () => {
      await world.runImport([userWithPassword(GO_HASH)], { scope: otherScope });

      const result = await world.runImport([userWithPassword(NODE_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 1,
      });
      expect(world.email.providerData).toEqual(tombstone);
      expect(world.email.isVerified).toBe(false);
      const warnings = result.warnings.join('\n');
      expect(warnings).toMatch(/passwordsSkippedConflict/);
      expect(warnings).not.toMatch(/passwordsSkippedExisting/);
      expect(JSON.stringify({ result, methods: world.methods })).not.toContain(GO_HASH);
      expect(JSON.stringify({ result, methods: world.methods })).not.toContain(NODE_HASH);
      // Neither environment's password signs in.
      await expect(loginWith(world, EMAIL, GO_PASSWORD)).rejects.toBeInstanceOf(
        AuthenticationError
      );
      await expect(loginWith(world, EMAIL, NODE_PASSWORD)).rejects.toBeInstanceOf(
        AuthenticationError
      );
    });

    it('every later import, from either project and with either hash, skips the row as a conflict', async () => {
      await world.runImport([userWithPassword(GO_HASH)], { scope: otherScope });
      await world.runImport([userWithPassword(NODE_HASH)]);
      world.calls.update.length = 0;

      const results = [
        await world.runImport([userWithPassword(GO_HASH)], { scope: otherScope }),
        await world.runImport([userWithPassword(NODE_HASH)], { scope: otherScope }),
        await world.runImport([userWithPassword(GO_HASH)]),
        await world.runImport([userWithPassword(NODE_HASH)]),
        await world.runImport([userWithPassword(NODE_HASH)], { strategy: CdmModeStrategy.Replace }),
      ];

      for (const result of results) {
        expect(counters(result)).toEqual({
          imported: 0,
          updated: 0,
          unchanged: 0,
          skipped: 0,
          conflict: 1,
        });
      }
      expect(world.calls.update).toEqual([]);
      expect(world.email.providerData).toEqual(tombstone);
    });

    it('ends in the same state whichever project imports first', async () => {
      const outcome = async (
        first: Scope,
        second: Scope,
        firstHash: string,
        secondHash: string
      ) => {
        const w = new World();
        const a = await w.runImport([userWithPassword(firstHash)], { scope: first });
        const b = await w.runImport([userWithPassword(secondHash)], { scope: second });
        return { counters: [counters(a), counters(b)], providerData: w.email.providerData };
      };

      const aThenB = await outcome(scope, otherScope, GO_HASH, NODE_HASH);
      const bThenA = await outcome(otherScope, scope, NODE_HASH, GO_HASH);

      expect(aThenB.providerData).toEqual(tombstone);
      expect(bThenA.providerData).toEqual(tombstone);
      expect(aThenB.counters).toEqual(bThenA.counters);
      expect(aThenB.counters).toEqual([
        { imported: 1, updated: 0, unchanged: 0, skipped: 0, conflict: 0 },
        { imported: 0, updated: 0, unchanged: 0, skipped: 0, conflict: 1 },
      ]);
    });

    it('the source project still replaces its own hash after another project sent the same one; the other project then conflicts', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);
      await world.runImport([userWithPassword(GO_HASH)], { scope: otherScope });

      const updated = await world.runImport([userWithPassword(NODE_HASH)]);
      expect(counters(updated)).toEqual({
        imported: 0,
        updated: 1,
        unchanged: 0,
        skipped: 0,
        conflict: 0,
      });

      const stale = await world.runImport([userWithPassword(GO_HASH)], { scope: otherScope });
      expect(counters(stale)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        conflict: 1,
      });
      expect(world.email.providerData).toEqual(tombstone);
    });

    describe('a credential written before the source project was recorded (v1.16.0)', () => {
      const legacy = (hash: string) => ({
        hashedPassword: hash,
        [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
      });

      it("takes the creating project as its source: another project's different hash is a conflict", async () => {
        const sibling = world.seedMethod(
          { providerId: EMAIL, providerData: legacy(GO_HASH) },
          otherProjectId
        );
        world.addProjectMembership(sibling.userId, otherProjectId);

        const result = await world.runImport([userWithPassword(NODE_HASH)]);

        expect(counters(result)).toEqual({
          imported: 0,
          updated: 0,
          unchanged: 0,
          skipped: 0,
          conflict: 1,
        });
        expect(world.email.providerData).toEqual(tombstone);
      });

      it("takes the creating project as its source: the same project's different hash replaces it and records itself", async () => {
        const own = world.seedMethod(
          { providerId: EMAIL, providerData: legacy(GO_HASH) },
          projectId
        );
        world.addProjectMembership(own.userId, projectId);

        const result = await world.runImport([userWithPassword(NODE_HASH)]);

        expect(counters(result)).toEqual({
          imported: 0,
          updated: 1,
          unchanged: 0,
          skipped: 0,
          conflict: 0,
        });
        expect(world.email.providerData).toEqual({
          hashedPassword: NODE_HASH,
          [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
          [PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY]: projectId,
        });
      });

      it('an identical hash is unchanged whichever project sends it', async () => {
        const sibling = world.seedMethod(
          { providerId: EMAIL, providerData: legacy(GO_HASH) },
          otherProjectId
        );
        world.addProjectMembership(sibling.userId, otherProjectId);

        const result = await world.runImport([userWithPassword(GO_HASH)]);

        expect(counters(result)).toEqual({
          imported: 0,
          updated: 0,
          unchanged: 1,
          skipped: 0,
          conflict: 0,
        });
        expect(world.calls.update).toEqual([]);
      });

      it('with no source anywhere, a different hash is a conflict rather than a guess', async () => {
        const unknown = world.seedMethod({ providerId: EMAIL, providerData: legacy(GO_HASH) });
        world.addProjectMembership(unknown.userId, otherProjectId);

        const result = await world.runImport([userWithPassword(NODE_HASH)]);

        expect(counters(result)).toEqual({
          imported: 0,
          updated: 0,
          unchanged: 0,
          skipped: 0,
          conflict: 1,
        });
        expect(world.email.providerData).toEqual(tombstone);
      });
    });

    it('a verified method keeps its imported credential: verification still wins over a conflict', async () => {
      await world.runImport([userWithPassword(GO_HASH)], { scope: otherScope });
      world.email.isVerified = true;
      world.calls.update.length = 0;

      const result = await world.runImport([userWithPassword(NODE_HASH)]);

      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
      expect(world.calls.update).toEqual([]);
      expect(world.email.providerData.hashedPassword).toBe(GO_HASH);
    });
  });

  describe('reset password after a conflict', () => {
    async function conflicted() {
      await world.runImport([userWithPassword(GO_HASH)], { scope: otherScope });
      await world.runImport([userWithPassword(NODE_HASH)]);
      expect(world.email.providerData[PASSWORD_CONFLICT_PROVIDER_DATA_KEY]).toBe(true);
    }

    it('clears the tombstone and the import marker, and later imports skip as Grant-owned', async () => {
      await conflicted();
      const requested = await world.authService.requestPasswordReset(EMAIL);
      expect(requested).not.toBeNull();
      // Requesting a reset must not drop the tombstone: only completing it does.
      expect(world.email.providerData[PASSWORD_CONFLICT_PROVIDER_DATA_KEY]).toBe(true);

      const userId = await world.authService.resetPassword(requested!.token, 'Reset-Passw0rd!');

      expect(userId).toBe(world.email.userId);
      expect(Object.keys(world.email.providerData).sort()).toEqual(['hashedPassword']);
      expect((await loginWith(world, EMAIL, 'Reset-Passw0rd!')).accessToken).toBe('access');
      const afterReset = { ...world.email.providerData };
      world.calls.update.length = 0;

      for (const importer of [scope, otherScope]) {
        const result = await world.runImport([userWithPassword(GO_HASH)], { scope: importer });
        expect(counters(result)).toEqual({
          imported: 0,
          updated: 0,
          unchanged: 0,
          skipped: 1,
          conflict: 0,
        });
      }
      expect(world.calls.update).toEqual([]);
      expect(world.email.providerData).toEqual(afterReset);
    });

    it('setting a first password in Grant (changePassword) clears the tombstone the same way', async () => {
      await conflicted();

      await world.authService.changePassword(world.email.userId, undefined, 'Grant-Side-Passw0rd!');

      expect(Object.keys(world.email.providerData).sort()).toEqual(['hashedPassword']);
      const result = await world.runImport([userWithPassword(GO_HASH)]);
      expect(counters(result)).toEqual({
        imported: 0,
        updated: 0,
        unchanged: 0,
        skipped: 1,
        conflict: 0,
      });
    });

    it('changePassword on a plain imported credential also drops the recorded source project', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);
      expect(world.email.providerData[PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY]).toBe(
        projectId
      );

      await world.authService.changePassword(
        world.email.userId,
        GO_PASSWORD,
        'Grant-Side-Passw0rd!'
      );

      expect(Object.keys(world.email.providerData).sort()).toEqual(['hashedPassword']);
    });
  });

  describe('the confinement lookup is batched', () => {
    it('resolves every email row of the import in one lookup and asks nothing per row', async () => {
      const emails = Array.from({ length: 25 }, (_, i) => `person${i}@example.test`);
      for (const email of emails) {
        const method = world.seedMethod({ providerId: email }, otherProjectId);
        world.addProjectMembership(method.userId, otherProjectId);
      }

      const result = await world.runImport(emails.map((email) => userWithPassword(GO_HASH, email)));

      expect(result.passwordsImported).toBe(25);
      expect(world.userRepository.findCdmPasswordIdentities).toHaveBeenCalledTimes(1);
      expect(world.calls.identityLookups[0]).toEqual({ projectId, emails });
      // Eligibility is decided in memory: no per-row provenance query either.
      expect(world.userRepository.findUserIdByCdmImport).not.toHaveBeenCalled();
    });

    it('does not look anything up when no row carries a password', async () => {
      world.seedMethod({ providerId: EMAIL });

      await world.runImport([userWithPassword(null)]);

      expect(world.userRepository.findCdmPasswordIdentities).not.toHaveBeenCalled();
    });
  });
});
