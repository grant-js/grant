import { SupportedLocale } from '@grantjs/i18n';

import { defaultLocale, translateStatic } from '@/i18n';

import { createAlternativeLink, createButton, renderBaseEmailTemplate } from './base.mjml';

import type { SendProjectOAuthMagicLinkParams } from '@grantjs/core';

const PROJECT_OAUTH_MAGIC_LINK_KEYS = {
  subject: 'email.projectOAuthMagicLink.subject',
  defaultAppName: 'email.projectOAuthMagicLink.defaultAppName',
  message: 'email.projectOAuthMagicLink.message',
  messageWithApp: 'email.projectOAuthMagicLink.messageWithApp',
  button: 'email.projectOAuthMagicLink.button',
  messageLink: 'email.projectOAuthMagicLink.messageLink',
  messageLinkWithApp: 'email.projectOAuthMagicLink.messageLinkWithApp',
} as const;

export function getProjectOAuthMagicLinkEmailSubject(
  params: SendProjectOAuthMagicLinkParams,
  locale: SupportedLocale = defaultLocale
): string {
  const emailLocale = (params.locale || locale) as SupportedLocale;
  const appName =
    params.appName || translateStatic(PROJECT_OAUTH_MAGIC_LINK_KEYS.defaultAppName, emailLocale);
  return translateStatic(PROJECT_OAUTH_MAGIC_LINK_KEYS.subject, emailLocale, { appName });
}

export function getProjectOAuthMagicLinkEmailHtml(
  params: SendProjectOAuthMagicLinkParams,
  locale: SupportedLocale = defaultLocale
): string {
  const { magicLinkUrl, appName, locale: paramsLocale } = params;
  const emailLocale = (paramsLocale || locale) as SupportedLocale;
  const subject = getProjectOAuthMagicLinkEmailSubject(params, emailLocale);
  const message = appName
    ? translateStatic(PROJECT_OAUTH_MAGIC_LINK_KEYS.messageWithApp, emailLocale, { appName })
    : translateStatic(PROJECT_OAUTH_MAGIC_LINK_KEYS.message, emailLocale);
  const buttonLabel = translateStatic(PROJECT_OAUTH_MAGIC_LINK_KEYS.button, emailLocale);

  const content = `
    <mj-text font-size="24px" font-weight="700" color="#1F2937" align="center" padding="0 0 20px 0">
      ${subject}
    </mj-text>

    <mj-text padding="10px 0">
      ${message}
    </mj-text>

    ${createButton(magicLinkUrl, buttonLabel)}

    ${createAlternativeLink(magicLinkUrl, emailLocale)}
  `;

  return renderBaseEmailTemplate({
    locale: emailLocale,
    subject,
    children: content,
  });
}

export function getProjectOAuthMagicLinkEmailText(
  params: SendProjectOAuthMagicLinkParams,
  locale: SupportedLocale = defaultLocale
): string {
  const { magicLinkUrl, appName, locale: paramsLocale } = params;
  const emailLocale = (paramsLocale || locale) as SupportedLocale;
  const subject = getProjectOAuthMagicLinkEmailSubject(params, emailLocale);
  const messageLink = appName
    ? translateStatic(PROJECT_OAUTH_MAGIC_LINK_KEYS.messageLinkWithApp, emailLocale, { appName })
    : translateStatic(PROJECT_OAUTH_MAGIC_LINK_KEYS.messageLink, emailLocale);
  return `${subject}\n\n${messageLink}\n\n${magicLinkUrl}`.trim();
}
