import { describe, expect, it } from 'vitest';

import { assertNotificationEmailFamilyCoverage } from '@/lib/notifications/notification-email-families';

describe('notification email family coverage', () => {
  it('maps every catalog event type to a family', () => {
    expect(assertNotificationEmailFamilyCoverage()).toEqual([]);
  });
});
