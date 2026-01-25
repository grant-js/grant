import { SupportedLocale } from '@grantjs/constants';

import { config } from '@/config';
import { defaultLocale, translateStatic } from '@/i18n';

import { SendOtpParams } from '../email.interface';

import { createAlternativeLink, createButton, renderBaseEmailTemplate } from './base.mjml';

export function getOtpEmailSubject(params: SendOtpParams): string {
  const emailLocale = (params.locale || defaultLocale) as SupportedLocale;
  return translateStatic('email:verification.subject', emailLocale);
}

export function getOtpEmailHtml(
  params: SendOtpParams,
  locale: SupportedLocale = defaultLocale
): string {
  const { token, validUntil, locale: paramsLocale } = params;
  const emailLocale = (paramsLocale || locale) as SupportedLocale;
  const verificationUrl = `${config.security.frontendUrl}/${emailLocale}/verify-email?token=${encodeURIComponent(token)}`;
  const expirationMinutes = Math.floor((validUntil - Date.now()) / 1000 / 60);

  const subject = translateStatic('email:verification.subject', emailLocale);

  const content = `
    <mj-text font-size="24px" font-weight="700" color="#1F2937" align="center" padding="0 0 20px 0">
      ${subject}
    </mj-text>

    <mj-text>
      ${translateStatic('email:verification.greeting', emailLocale)}
    </mj-text>

    <mj-text>
      ${translateStatic('email:verification.message', emailLocale)}
    </mj-text>

    ${createButton(verificationUrl, translateStatic('email:verification.button', emailLocale))}

    <mj-text align="center" font-size="14px" color="#6B7280" padding="10px 0 20px 0">
      ${translateStatic('email:verification.expiresIn', emailLocale, {
        minutes: expirationMinutes,
      })}
    </mj-text>

    ${createAlternativeLink(verificationUrl, emailLocale)}
  `;

  return renderBaseEmailTemplate({
    locale: emailLocale,
    subject,
    children: content,
  });
}

export function getOtpEmailText(
  params: SendOtpParams,
  locale: SupportedLocale = defaultLocale
): string {
  const { token, validUntil, locale: paramsLocale } = params;
  const emailLocale = (paramsLocale || locale) as SupportedLocale;
  const verificationUrl = `${config.security.frontendUrl}/${emailLocale}/verify-email?token=${encodeURIComponent(token)}`;
  const expirationMinutes = Math.floor((validUntil - Date.now()) / 1000 / 60);

  const t = {
    subject: translateStatic('email:verification.subject', emailLocale),
    greeting: translateStatic('email:verification.greeting', emailLocale),
    message: translateStatic('email:verification.message', emailLocale),
    expiresIn: translateStatic('email:verification.expiresIn', emailLocale, {
      minutes: expirationMinutes,
    }),
    footerNoRequest: translateStatic('email:verification.footer.noRequest', emailLocale),
    footerTypo: translateStatic('email:verification.footer.typo', emailLocale),
    signature: translateStatic('email:verification.signature', emailLocale),
  };

  return `
${t.subject}

${t.greeting}

${t.message}

${verificationUrl}

${t.expiresIn}

${t.footerNoRequest}
${t.footerTypo}

---
${t.signature}
  `.trim();
}
