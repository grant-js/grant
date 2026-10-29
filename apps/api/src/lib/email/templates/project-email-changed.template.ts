import type { SendProjectEmailChangedParams } from '@grantjs/core';
import { SupportedLocale } from '@grantjs/i18n';

import { defaultLocale, translateStatic } from '@/i18n';
import { escapeHtml } from '@/lib/email/html-escape.lib';

import { renderBaseEmailTemplate } from './base.mjml';

const KEYS = {
  subject: 'email.projectEmailChanged.subject',
  defaultAppName: 'email.projectEmailChanged.defaultAppName',
  message: 'email.projectEmailChanged.message',
  warning: 'email.projectEmailChanged.warning',
} as const;

/**
 * The notice has no link and no button, and the new address is not a parameter: the person
 * reading it is not proven to own it, and a link in a mail about a security change is what a
 * phishing mail looks like.
 */
function resolveContent(params: SendProjectEmailChangedParams, locale: SupportedLocale) {
  const emailLocale = (params.locale || locale) as SupportedLocale;
  const appName = params.appName || translateStatic(KEYS.defaultAppName, emailLocale);
  return {
    emailLocale,
    appName,
    subject: translateStatic(KEYS.subject, emailLocale, { appName }),
    warning: translateStatic(KEYS.warning, emailLocale, { appName }),
  };
}

export function getProjectEmailChangedEmailSubject(
  params: SendProjectEmailChangedParams,
  locale: SupportedLocale = defaultLocale
): string {
  return resolveContent(params, locale).subject;
}

export async function getProjectEmailChangedEmailHtml(
  params: SendProjectEmailChangedParams,
  locale: SupportedLocale = defaultLocale
): Promise<string> {
  const { emailLocale, appName, subject, warning } = resolveContent(params, locale);
  // The app name is tenant-supplied: it goes into markup escaped.
  const message = translateStatic(KEYS.message, emailLocale, { appName: escapeHtml(appName) });

  const content = `
    <mj-text font-size="24px" font-weight="700" color="#1F2937" align="center" padding="0 0 20px 0">
      ${escapeHtml(subject)}
    </mj-text>

    <mj-text padding="10px 0">
      ${message}
    </mj-text>
  `;

  return await renderBaseEmailTemplate({
    locale: emailLocale,
    subject,
    children: content,
    footerWarning: escapeHtml(warning),
  });
}

export function getProjectEmailChangedEmailText(
  params: SendProjectEmailChangedParams,
  locale: SupportedLocale = defaultLocale
): string {
  const { emailLocale, appName, subject, warning } = resolveContent(params, locale);
  const message = translateStatic(KEYS.message, emailLocale, { appName });
  return `${subject}\n\n${message}\n\n${warning}`.trim();
}
