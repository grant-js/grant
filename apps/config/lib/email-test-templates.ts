import type { EmailTemplates } from '@grantjs/email';
import type {
  SendInvitationParams,
  SendOtpParams,
  SendPasswordResetParams,
  SendProjectOAuthMagicLinkParams,
} from '@grantjs/core';

const stub = (): string => '';

/** Minimal stub templates for test-email: only OTP content is used; others return empty. */
export const emailTestTemplates: EmailTemplates = {
  getInvitationEmailSubject: (_: SendInvitationParams) => stub(),
  getInvitationEmailHtml: (_: SendInvitationParams) => stub(),
  getInvitationEmailText: (_: SendInvitationParams) => stub(),
  getOtpEmailSubject: () => 'Grant Config – test email',
  getOtpEmailHtml: () =>
    '<p>This is a test email from the Grant Platform config app. Your email provider is configured correctly.</p>',
  getOtpEmailText: () =>
    'This is a test email from the Grant Platform config app. Your email provider is configured correctly.',
  getPasswordResetEmailSubject: (_: SendPasswordResetParams) => stub(),
  getPasswordResetEmailHtml: (_: SendPasswordResetParams) => stub(),
  getPasswordResetEmailText: (_: SendPasswordResetParams) => stub(),
  getProjectOAuthMagicLinkEmailSubject: (_: SendProjectOAuthMagicLinkParams) => stub(),
  getProjectOAuthMagicLinkEmailHtml: (_: SendProjectOAuthMagicLinkParams) => stub(),
  getProjectOAuthMagicLinkEmailText: (_: SendProjectOAuthMagicLinkParams) => stub(),
};
