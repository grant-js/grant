import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComposedNotificationEmail } from '@/lib/notifications/notification-email-composer';

vi.mock('@/i18n', () => ({
  defaultLocale: 'en',
  translateStatic: (key: string) => key,
}));

vi.mock('@/lib/email/templates/base.mjml', () => ({
  createButton: (url: string, text: string) => `<mj-button href="${url}">${text}</mj-button>`,
  createAlternativeLink: (url: string) => `<mj-text>${url}</mj-text>`,
  renderBaseEmailTemplate: vi.fn(
    async (props: { children: string; footerWarning?: string }) =>
      `<html>${props.children}${props.footerWarning ?? ''}</html>`
  ),
}));

import { renderBaseEmailTemplate } from '@/lib/email/templates/base.mjml';
import {
  getNotificationEmailHtml,
  getNotificationEmailText,
} from '@/lib/email/templates/notification.template';

const content: ComposedNotificationEmail = {
  subject: 'Role created',
  heading: 'Role created',
  summary: 'Role "Dev & QA" was created',
  details: [{ label: 'Actor', value: 'Alice <admin>' }],
  ctaUrl: 'https://app.example.test/en/dashboard/notifications',
  ctaLabel: 'View in Grant',
  preferencesUrl: 'https://app.example.test/en/dashboard/settings/notifications',
  footer: 'You are subscribed',
};

describe('notification email template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('escapes user-controlled values in HTML', async () => {
    const html = await getNotificationEmailHtml(content, 'en');
    expect(html).toContain('Role &quot;Dev &amp; QA&quot; was created');
    expect(html).toContain('Alice &lt;admin&gt;');
    expect(html).not.toContain('Alice <admin>');
    expect(renderBaseEmailTemplate).toHaveBeenCalled();
  });

  it('includes details and CTA in plain text', () => {
    const text = getNotificationEmailText(content, 'en');
    expect(text).toContain('Role "Dev & QA" was created');
    expect(text).toContain('Actor: Alice <admin>');
    expect(text).toContain(content.ctaUrl);
    expect(text).toContain(content.preferencesUrl);
  });
});
