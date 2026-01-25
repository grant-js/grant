import { isRoleI18nKey, SupportedLocale } from '@grantjs/constants';

import { defaultLocale, translateStatic } from '@/i18n';

import { createAlternativeLink, createButton, renderBaseEmailTemplate } from './base.mjml';

import type { SendInvitationParams } from '../email.interface';

export function getInvitationEmailSubject(
  params: SendInvitationParams,
  locale: SupportedLocale = defaultLocale
): string {
  const emailLocale = (params.locale || locale) as SupportedLocale;
  return translateStatic('email:invitation.subject', emailLocale, {
    organizationName: params.organizationName,
  });
}

export function getInvitationEmailHtml(
  params: SendInvitationParams,
  locale: SupportedLocale = defaultLocale
): string {
  const {
    organizationName,
    inviterName,
    invitationUrl,
    roleName,
    expiresInDays = 7,
    locale: paramsLocale,
  } = params;
  const emailLocale = (paramsLocale || locale) as SupportedLocale;

  const translatedRoleName = isRoleI18nKey(roleName)
    ? translateStatic(`common:${roleName}`, emailLocale)
    : roleName;

  const subject = translateStatic('email:invitation.subject', emailLocale, {
    organizationName,
  });

  const content = `
    <mj-text font-size="24px" font-weight="700" color="#1F2937" align="center" padding="0 0 20px 0">
      ${subject}
    </mj-text>

    <mj-text>
      ${translateStatic('email:invitation.greeting', emailLocale)}
    </mj-text>

    <mj-text>
      ${translateStatic('email:invitation.message', emailLocale, {
        inviterName,
        organizationName,
        roleName: translatedRoleName,
      })}
    </mj-text>

    <mj-text background-color="#F9FAFB" padding="15px" border-radius="6px">
      <strong style="color: #1F2937;">Organization:</strong>
      <span style="color: #4B5563;">${organizationName}</span><br/>
      <strong style="color: #1F2937;">Role:</strong>
      <span style="color: #4B5563;">${translatedRoleName}</span>
    </mj-text>

    ${createButton(invitationUrl, translateStatic('email:invitation.button', emailLocale))}

    <mj-text align="center" font-size="14px" color="#6B7280" padding="10px 0 20px 0">
      ${translateStatic('email:invitation.expiresIn', emailLocale, {
        days: expiresInDays,
      })}
    </mj-text>

    ${createAlternativeLink(invitationUrl, emailLocale)}
  `;

  return renderBaseEmailTemplate({
    locale: emailLocale,
    subject,
    children: content,
  });
}

export function getInvitationEmailText(
  params: SendInvitationParams,
  locale: SupportedLocale = defaultLocale
): string {
  const {
    organizationName,
    inviterName,
    invitationUrl,
    roleName,
    expiresInDays = 7,
    locale: paramsLocale,
  } = params;
  const emailLocale = (paramsLocale || locale) as SupportedLocale;

  const translatedRoleName = isRoleI18nKey(roleName)
    ? translateStatic(`common:${roleName}`, emailLocale)
    : roleName;

  const t = {
    subject: translateStatic('email:invitation.subject', emailLocale, {
      organizationName,
    }),
    greeting: translateStatic('email:invitation.greeting', emailLocale),
    message: translateStatic('email:invitation.message', emailLocale, {
      inviterName,
      organizationName,
      roleName: translatedRoleName,
    }),
    expiresIn: translateStatic('email:invitation.expiresIn', emailLocale, {
      days: expiresInDays,
    }),
    footerNoRequest: translateStatic('email:invitation.footer.noRequest', emailLocale),
    signature: translateStatic('email:common.signature', emailLocale),
  };

  return `
${t.subject}

${t.greeting}

${t.message}

${translateStatic('email:invitation.organization', emailLocale)}: ${organizationName}
${translateStatic('email:invitation.role', emailLocale)}: ${translatedRoleName}

${invitationUrl}

${t.expiresIn}

${t.footerNoRequest}

---
${t.signature}
  `.trim();
}
