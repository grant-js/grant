import type { SupportedLocale } from '@grantjs/i18n';

import { defaultLocale, translateStatic } from '@/i18n';
import { escapeHtml } from '@/lib/email/html-escape.lib';
import type { ComposedNotificationEmail } from '@/lib/notifications/notification-email-composer';

import { createAlternativeLink, createButton, renderBaseEmailTemplate } from './base.mjml';

export function getNotificationEmailSubject(content: ComposedNotificationEmail): string {
  return content.subject;
}

export async function getNotificationEmailHtml(
  content: ComposedNotificationEmail,
  locale: SupportedLocale = defaultLocale
): Promise<string> {
  const detailsHtml =
    content.details.length > 0
      ? `<mj-text background-color="#F9FAFB" padding="15px" border-radius="6px">${content.details
          .map(
            (row) =>
              `<strong style="color: #1F2937;">${escapeHtml(row.label)}:</strong> <span style="color: #4B5563;">${escapeHtml(row.value)}</span>`
          )
          .join('<br/>')}</mj-text>`
      : '';

  const children = `
    <mj-text font-size="24px" font-weight="700" color="#1F2937" align="center" padding="0 0 20px 0">
      ${escapeHtml(content.heading)}
    </mj-text>

    <mj-text>
      ${escapeHtml(translateStatic('email.notification.common.greeting', locale))}
    </mj-text>

    <mj-text>
      ${escapeHtml(content.summary)}
    </mj-text>

    ${detailsHtml}

    ${createButton(content.ctaUrl, escapeHtml(content.ctaLabel))}

    ${createAlternativeLink(content.ctaUrl, locale)}

    <mj-text align="center" font-size="13px" color="#6B7280" padding="16px 0 0 0">
      <a href="${escapeHtml(content.preferencesUrl)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(translateStatic('email.notification.common.managePreferences', locale))}</a>
    </mj-text>
  `;

  return renderBaseEmailTemplate({
    locale,
    subject: content.subject,
    children,
    footerWarning: escapeHtml(content.footer),
  });
}

export function getNotificationEmailText(
  content: ComposedNotificationEmail,
  locale: SupportedLocale = defaultLocale
): string {
  const details = content.details.map((row) => `${row.label}: ${row.value}`).join('\n');
  const manage = translateStatic('email.notification.common.managePreferences', locale);
  const greeting = translateStatic('email.notification.common.greeting', locale);
  const alternative = translateStatic('email.common.alternativeText', locale);
  const signature = translateStatic('email.common.signature', locale);

  return [
    content.heading,
    '',
    greeting,
    '',
    content.summary,
    details ? `\n${details}\n` : '',
    content.ctaUrl,
    '',
    alternative,
    content.ctaUrl,
    '',
    manage,
    content.preferencesUrl,
    '',
    content.footer,
    '',
    '---',
    signature,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
