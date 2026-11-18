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
  getProjectIdentityLinkedEmailHtml,
  getProjectIdentityLinkedEmailSubject,
  getProjectIdentityLinkedEmailText,
} from '@/lib/email/templates/project-identity-linked.template';

const params = { appName: 'Docs', locale: 'de' };

describe('project identity linked template (keys and escaping)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('brands the subject with the app name, falling back to a generic name', () => {
    expect(getProjectIdentityLinkedEmailSubject(params)).toBe(
      'email.projectIdentityLinked.subject|appName=Docs'
    );
    expect(getProjectIdentityLinkedEmailSubject({ ...params, appName: undefined })).toBe(
      'email.projectIdentityLinked.subject|appName=email.projectIdentityLinked.defaultAppName'
    );
  });

  it('escapes a tenant-supplied app name in the HTML but not in the plain text', async () => {
    const appName = '<img src=x onerror=alert(1)> & Co';
    const html = await getProjectIdentityLinkedEmailHtml({ ...params, appName });

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; Co');
    expect(getProjectIdentityLinkedEmailText({ ...params, appName })).toContain(appName);
  });

  it('puts the message and the "if unexpected" warning in the plain text', () => {
    const text = getProjectIdentityLinkedEmailText(params);

    expect(text).toContain('email.projectIdentityLinked.message|appName=Docs');
    expect(text).toContain('email.projectIdentityLinked.warning|appName=Docs');
  });
});
