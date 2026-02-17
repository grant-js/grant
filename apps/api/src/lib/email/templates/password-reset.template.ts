import { SupportedLocale } from '@grantjs/i18n';

import { config } from '@/config';
import { defaultLocale, translateStatic } from '@/i18n';

import { createAlternativeLink, createButton, renderBaseEmailTemplate } from './base.mjml';

import type { SendPasswordResetParams } from '../';

export function getPasswordResetEmailSubject(params: SendPasswordResetParams): string {
  const emailLocale = (params.locale || defaultLocale) as SupportedLocale;
  return translateStatic('email.passwordReset.subject', emailLocale);
}

export function getPasswordResetEmailHtml(
  params: SendPasswordResetParams,
  locale: SupportedLocale = defaultLocale
): string {
  const { token, validUntil, locale: paramsLocale } = params;
  const emailLocale = (paramsLocale || locale) as SupportedLocale;
  const resetUrl = `${config.security.frontendUrl}/${emailLocale}/reset-password?token=${encodeURIComponent(token)}`;
  const expirationMinutes = Math.floor((validUntil - Date.now()) / 1000 / 60);

  const subject = translateStatic('email.passwordReset.subject', emailLocale);

  const content = `
    <mj-text font-size="24px" font-weight="700" color="#1F2937" align="center" padding="0 0 20px 0">
      ${subject}
    </mj-text>

    <mj-text padding="10px 0">
      ${translateStatic('email.passwordReset.greeting', emailLocale)}
    </mj-text>

    <mj-text padding="10px 0">
      ${translateStatic('email.passwordReset.message', emailLocale)}
    </mj-text>

    ${createButton(resetUrl, translateStatic('email.passwordReset.button', emailLocale))}

    <mj-text align="center" font-size="14px" color="#6B7280" padding="10px 0 20px 0">
      ${translateStatic('email.passwordReset.expiresIn', emailLocale, {
        minutes: expirationMinutes,
      })}
    </mj-text>

    ${createAlternativeLink(resetUrl, emailLocale)}
  `;

  return renderBaseEmailTemplate({
    locale: emailLocale,
    subject,
    children: content,
    footerWarning: translateStatic('email.passwordReset.warning', emailLocale),
  });
}

export function getPasswordResetEmailText(
  params: SendPasswordResetParams,
  locale: SupportedLocale = defaultLocale
): string {
  const { token, validUntil, locale: paramsLocale } = params;
  const emailLocale = (paramsLocale || locale) as SupportedLocale;
  const resetUrl = `${config.security.frontendUrl}/${emailLocale}/reset-password?token=${encodeURIComponent(token)}`;
  const expirationMinutes = Math.floor((validUntil - Date.now()) / 1000 / 60);

  const subject = translateStatic('email.passwordReset.subject', emailLocale);

  const t = {
    subject,
    greeting: translateStatic('email.passwordReset.greeting', emailLocale),
    message: translateStatic('email.passwordReset.message', emailLocale),
    expiresIn: translateStatic('email.passwordReset.expiresIn', emailLocale, {
      minutes: expirationMinutes,
    }),
    warning: translateStatic('email.passwordReset.warning', emailLocale),
    footerNoRequest: translateStatic('email.common.footer.noRequest', emailLocale),
    footerTypo: translateStatic('email.common.footer.typo', emailLocale),
    signature: translateStatic('email.common.signature', emailLocale),
  };

  return `
${t.subject}

${t.greeting}

${t.message}

${resetUrl}

${t.expiresIn}

${t.warning}

${t.footerNoRequest}
${t.footerTypo}

---
${t.signature}
  `.trim();
}
