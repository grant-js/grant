/**
 * In-memory stand-in for the project password reset repository (ADR 0011 § 6), with the
 * semantics of the real one. The SQL itself (the atomic upsert, the row lock) is covered
 * against PostgreSQL in `project-password-reset.postgres.integration.test.ts`.
 */
import type {
  ClaimedProjectPasswordReset,
  IProjectPasswordResetRepository,
  IssueProjectPasswordResetParams,
} from '@grantjs/core';

export interface FakeResetRow {
  id: string;
  projectId: string;
  userId: string;
  authMethodId: string;
  tokenHash: string | null;
  expiresAt: Date;
  requestCount: number;
  windowStartedAt: Date;
}

/** In-memory stand-in with the semantics of the real repository. */
export class FakeResetRepository implements IProjectPasswordResetRepository {
  rows: FakeResetRow[] = [];

  async issue(params: IssueProjectPasswordResetParams): Promise<boolean> {
    const existing = this.rows.find(
      (row) => row.projectId === params.projectId && row.userId === params.userId
    );
    if (!existing) {
      this.rows.push({
        id: `reset-${this.rows.length + 1}`,
        projectId: params.projectId,
        userId: params.userId,
        authMethodId: params.authMethodId,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
        requestCount: 1,
        windowStartedAt: params.now,
      });
      return true;
    }
    const lapsed =
      existing.windowStartedAt.getTime() < params.now.getTime() - params.limit.windowMs;
    if (!lapsed && existing.requestCount >= params.limit.maxRequests) {
      return false;
    }
    existing.authMethodId = params.authMethodId;
    existing.tokenHash = params.tokenHash;
    existing.expiresAt = params.expiresAt;
    existing.requestCount = lapsed ? 1 : existing.requestCount + 1;
    if (lapsed) existing.windowStartedAt = params.now;
    return true;
  }

  async claimByTokenHash(
    projectId: string,
    tokenHash: string
  ): Promise<ClaimedProjectPasswordReset | null> {
    const row = this.rows.find((r) => r.projectId === projectId && r.tokenHash === tokenHash);
    return row ? { ...row, tokenHash: row.tokenHash as string } : null;
  }

  async consume(id: string): Promise<void> {
    const row = this.rows.find((r) => r.id === id);
    if (row) row.tokenHash = null;
  }
}
