import { beforeEach, describe, expect, it, vi } from 'vitest';

// Translations are stubbed to `key|param=value`, so the test sees which key was used and
// with what values, without depending on the wording.
vi.mock('@/i18n', () => ({
  defaultLocale: 'en',
  translateStatic: (key: string, _locale: string, params?: Record<string, unknown>) =>
    params
      ? `${key}|${Object.entries(params)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')}`
      : key,
}));

vi.mock('@/lib/email/templates/base.mjml', () => ({
  createButton: (url: string, text: string) => `<mj-button href="${url}">${text}</mj-button>`,
  createAlternativeLink: (url: string) => `<mj-text>${url}</mj-text>`,
  renderBaseEmailTemplate: vi.fn(
    async (props: { children: string; footerWarning?: string }) =>
      `<html>${props.children}${props.footerWarning ?? ''}</html>`
  ),
}));

import {
  getProjectPasswordResetEmailHtml,
  getProjectPasswordResetEmailSubject,
  getProjectPasswordResetEmailText,
} from '@/lib/email/templates/project-password-reset.template';

const RESET_URL = 'https://app.example.test/en/auth/project/reset-password?client_id=c#token=abc';

const params = {
  to: 'member@example.com',
  resetUrl: RESET_URL,
  validUntil: Date.now() + 30 * 60_000 + 5_000,
  appName: 'Docs',
  locale: 'de',
};

describe('project password reset email template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('brands the subject with the app name, falling back to a generic name', () => {
    expect(getProjectPasswordResetEmailSubject(params)).toBe(
      'email.projectPasswordReset.subject|appName=Docs'
    );
    expect(getProjectPasswordResetEmailSubject({ ...params, appName: undefined })).toBe(
      'email.projectPasswordReset.subject|appName=email.projectPasswordReset.defaultAppName'
    );
  });

  it('carries the reset link as the button and as the alternative link, with the minutes left', async () => {
    const html = await getProjectPasswordResetEmailHtml(params);

    expect(html).toContain(`<mj-button href="${RESET_URL}">`);
    expect(html.split(RESET_URL).length - 1).toBeGreaterThanOrEqual(2);
    expect(html).toContain('email.projectPasswordReset.expiresIn|minutes=30');
  });

  it('escapes a tenant-supplied app name in the HTML', async () => {
    const html = await getProjectPasswordResetEmailHtml({
      ...params,
      appName: '<img src=x onerror=alert(1)> & Co',
    });

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; Co');
  });

  it('puts the link, the expiry and the "ignore this" warning in the plain text', () => {
    const text = getProjectPasswordResetEmailText(params);

    expect(text).toContain(RESET_URL);
    expect(text).toContain('email.projectPasswordReset.messageLink|appName=Docs');
    expect(text).toContain('email.projectPasswordReset.expiresIn|minutes=30');
    expect(text).toContain('email.projectPasswordReset.warning');
  });

  it('never reports fewer than one minute left', () => {
    const text = getProjectPasswordResetEmailText({ ...params, validUntil: Date.now() - 1000 });

    expect(text).toContain('minutes=1');
  });
});
