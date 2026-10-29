import { beforeAll, describe, expect, it } from 'vitest';

import { initializeI18n } from '@/i18n';
import {
  getProjectEmailChangedEmailHtml,
  getProjectEmailChangedEmailSubject,
  getProjectEmailChangedEmailText,
} from '@/lib/email/templates/project-email-changed.template';

/**
 * Rendered for real: the catalogue, the shared base template and MJML are not stubbed, so this
 * is what the previous address receives. The template has no parameter for the new address;
 * the sentinel below is the address the operator typed, and it must appear nowhere.
 */
const NEW_ADDRESS_SENTINEL = 'sentinel-new-address@example.test';
const PREVIOUS_ADDRESS = 'previous-address@example.test';

beforeAll(async () => {
  await initializeI18n();
});

const cases = [
  {
    locale: 'en',
    changed: /administrator changed the email address/i,
    contact: /contact the administrator of Docs/i,
  },
  {
    locale: 'de',
    changed: /Administrator hat die E-Mail-Adresse geändert/,
    contact: /Administrator von Docs/,
  },
] as const;

describe.each(cases)('project email changed notice, $locale', ({ locale, changed, contact }) => {
  // What a caller passes: the recipient, the name, the locale. Nothing names the new address.
  const params = { to: PREVIOUS_ADDRESS, appName: 'Docs', locale };

  it('names the app in the subject and says who changed the address and whom to contact', async () => {
    const subject = getProjectEmailChangedEmailSubject(params);
    const html = await getProjectEmailChangedEmailHtml(params);
    const text = getProjectEmailChangedEmailText(params);

    expect(subject).toContain('Docs');
    expect(html).toContain('Docs');
    expect(text).toContain('Docs');
    expect(html).toMatch(changed);
    expect(text).toMatch(changed);
    expect(html).toMatch(contact);
    expect(text).toMatch(contact);
  });

  it('has no link or button, and carries neither the new address nor the recipient', async () => {
    const html = await getProjectEmailChangedEmailHtml(params);
    const text = getProjectEmailChangedEmailText(params);
    const subject = getProjectEmailChangedEmailSubject(params);

    // The shared base template links its web-font stylesheets from <head>; those are not
    // links the reader can follow. Everything else must be free of `href`.
    expect(html.replace(/<link\b[^>]*rel=\\?"stylesheet\\?"[^>]*>/gi, '')).not.toMatch(/href\s*=/i);
    expect(html).not.toMatch(/<a[\s>]/i);
    expect(html).not.toMatch(/<button/i);
    expect(text).not.toMatch(/https?:\/\//i);
    for (const rendered of [subject, html, text]) {
      expect(rendered).not.toContain(NEW_ADDRESS_SENTINEL);
      expect(rendered).not.toContain(PREVIOUS_ADDRESS);
    }
  });
});

describe('project email changed notice, app name fallback', () => {
  it.each([
    ['en', 'the app'],
    ['de', 'die App'],
  ] as const)('uses the generic name in %s when none is given', (locale, generic) => {
    expect(getProjectEmailChangedEmailSubject({ to: PREVIOUS_ADDRESS, locale })).toContain(generic);
  });
});
