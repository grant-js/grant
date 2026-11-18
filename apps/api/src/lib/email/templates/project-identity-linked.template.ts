import { SupportedLocale } from '@grantjs/i18n';

import { defaultLocale, translateStatic } from '@/i18n';
import { escapeHtml } from '@/lib/email/html-escape.lib';

import { renderBaseEmailTemplate } from './base.mjml';

export interface ProjectIdentityLinkedNoticeParams {
  appName?: string;
  locale?: string;
}

const KEYS = {
  subject: 'email.projectIdentityLinked.subject',
  defaultAppName: 'email.projectIdentityLinked.defaultAppName',
  message: 'email.projectIdentityLinked.message',
  warning: 'email.projectIdentityLinked.warning',
} as const;

/**
 * Told to the address of the identity an operator linked a project member to. No link and no
 * button, like the previous-address notice: it reports a change made by someone else.
 */
function resolveContent(params: ProjectIdentityLinkedNoticeParams, locale: SupportedLocale) {
  const emailLocale = (params.locale || locale) as SupportedLocale;
  const appName = params.appName || translateStatic(KEYS.defaultAppName, emailLocale);
  return {
    emailLocale,
    appName,
    subject: translateStatic(KEYS.subject, emailLocale, { appName }),
    warning: translateStatic(KEYS.warning, emailLocale, { appName }),
  };
}

export function getProjectIdentityLinkedEmailSubject(
  params: ProjectIdentityLinkedNoticeParams,
  locale: SupportedLocale = defaultLocale
): string {
  return resolveContent(params, locale).subject;
}

export async function getProjectIdentityLinkedEmailHtml(
  params: ProjectIdentityLinkedNoticeParams,
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

export function getProjectIdentityLinkedEmailText(
  params: ProjectIdentityLinkedNoticeParams,
  locale: SupportedLocale = defaultLocale
): string {
  const { emailLocale, appName, subject, warning } = resolveContent(params, locale);
  const message = translateStatic(KEYS.message, emailLocale, { appName });
  return `${subject}\n\n${message}\n\n${warning}`.trim();
}
