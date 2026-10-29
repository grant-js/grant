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
  renderBaseEmailTemplate: vi.fn(
    async (props: { children: string; footerWarning?: string }) =>
      `<html>${props.children}${props.footerWarning ?? ''}</html>`
  ),
}));

import {
  getProjectEmailChangedEmailHtml,
  getProjectEmailChangedEmailSubject,
  getProjectEmailChangedEmailText,
} from '@/lib/email/templates/project-email-changed.template';

const params = { to: 'previous@example.com', appName: 'Docs', locale: 'de' };

describe('project email changed template (keys and escaping)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('brands the subject with the app name, falling back to a generic name', () => {
    expect(getProjectEmailChangedEmailSubject(params)).toBe(
      'email.projectEmailChanged.subject|appName=Docs'
    );
    expect(getProjectEmailChangedEmailSubject({ ...params, appName: undefined })).toBe(
      'email.projectEmailChanged.subject|appName=email.projectEmailChanged.defaultAppName'
    );
  });

  it('escapes a tenant-supplied app name in the HTML but not in the plain text', async () => {
    const appName = '<img src=x onerror=alert(1)> & Co';
    const html = await getProjectEmailChangedEmailHtml({ ...params, appName });

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; Co');
    expect(getProjectEmailChangedEmailText({ ...params, appName })).toContain(appName);
  });

  it('puts the message and the "if unexpected" warning in the plain text', () => {
    const text = getProjectEmailChangedEmailText(params);

    expect(text).toContain('email.projectEmailChanged.message|appName=Docs');
    expect(text).toContain('email.projectEmailChanged.warning|appName=Docs');
  });
});
