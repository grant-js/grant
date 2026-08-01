import type { IAuditLogger, IEventPublisher, IUserSessionRepository } from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserSessionService } from '@/services/user-sessions.service';

const sessionId = '10000000-0000-4000-8000-000000000090';
const userId = '10000000-0000-4000-8000-000000000091';

function buildService() {
  const userSessionRepository = {
    softDeleteUserSession: vi.fn().mockResolvedValue({
      id: sessionId,
      userId,
      deletedAt: new Date('2026-01-02T00:00:00.000Z'),
    }),
  } as unknown as IUserSessionRepository;

  const audit = {
    logUpdate: vi.fn(),
  } as unknown as IAuditLogger;

  const events = {
    publish: vi.fn(),
  } as unknown as IEventPublisher;

  return {
    service: new UserSessionService(userSessionRepository, audit, {} as never, events),
    events,
  };
}

describe('UserSessionService security events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes user.session_revoked after revokeSession', async () => {
    const { service, events } = buildService();

    await service.revokeSession(sessionId);

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'user.session_revoked',
        subjectUserId: userId,
        aggregate: { kind: 'userSession', id: sessionId },
      }),
      undefined
    );
  });
});
