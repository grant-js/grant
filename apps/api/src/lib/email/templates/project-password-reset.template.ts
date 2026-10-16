import type { SendProjectPasswordResetParams } from '@grantjs/core';
import { SupportedLocale } from '@grantjs/i18n';

import { defaultLocale, translateStatic } from '@/i18n';
import { escapeHtml } from '@/lib/email/html-escape.lib';

import { createAlternativeLink, createButton, renderBaseEmailTemplate } from './base.mjml';

const KEYS = {
  subject: 'email.projectPasswordReset.subject',
  defaultAppName: 'email.projectPasswordReset.defaultAppName',
  message: 'email.projectPasswordReset.message',
  button: 'email.projectPasswordReset.button',
  messageLink: 'email.projectPasswordReset.messageLink',
  expiresIn: 'email.projectPasswordReset.expiresIn',
  warning: 'email.projectPasswordReset.warning',
} as const;

function resolveContent(params: SendProjectPasswordResetParams, locale: SupportedLocale) {
  const emailLocale = (params.locale || locale) as SupportedLocale;
  const appName = params.appName || translateStatic(KEYS.defaultAppName, emailLocale);
  const expirationMinutes = Math.max(1, Math.floor((params.validUntil - Date.now()) / 1000 / 60));
  return {
    emailLocale,
    appName,
    subject: translateStatic(KEYS.subject, emailLocale, { appName }),
    expiresIn: translateStatic(KEYS.expiresIn, emailLocale, { minutes: expirationMinutes }),
    warning: translateStatic(KEYS.warning, emailLocale, { appName }),
  };
}

export function getProjectPasswordResetEmailSubject(
  params: SendProjectPasswordResetParams,
  locale: SupportedLocale = defaultLocale
): string {
  return resolveContent(params, locale).subject;
}

export async function getProjectPasswordResetEmailHtml(
  params: SendProjectPasswordResetParams,
  locale: SupportedLocale = defaultLocale
): Promise<string> {
  const { emailLocale, appName, subject, expiresIn, warning } = resolveContent(params, locale);
  // The app name is tenant-supplied: it goes into markup escaped.
  const message = translateStatic(KEYS.message, emailLocale, { appName: escapeHtml(appName) });
  const buttonLabel = translateStatic(KEYS.button, emailLocale);

  const content = `
    <mj-text font-size="24px" font-weight="700" color="#1F2937" align="center" padding="0 0 20px 0">
      ${escapeHtml(subject)}
    </mj-text>

    <mj-text padding="10px 0">
      ${message}
    </mj-text>

    ${createButton(params.resetUrl, buttonLabel)}

    <mj-text align="center" font-size="14px" color="#6B7280" padding="10px 0 20px 0">
      ${expiresIn}
    </mj-text>

    ${createAlternativeLink(params.resetUrl, emailLocale)}
  `;

  return await renderBaseEmailTemplate({
    locale: emailLocale,
    subject,
    children: content,
    footerWarning: escapeHtml(warning),
  });
}

export function getProjectPasswordResetEmailText(
  params: SendProjectPasswordResetParams,
  locale: SupportedLocale = defaultLocale
): string {
  const { emailLocale, appName, subject, expiresIn, warning } = resolveContent(params, locale);
  const messageLink = translateStatic(KEYS.messageLink, emailLocale, { appName });
  return `${subject}\n\n${messageLink}\n\n${params.resetUrl}\n\n${expiresIn}\n\n${warning}`.trim();
}
