import type {
  SendInvitationParams,
  SendPasswordResetParams,
  SendProjectEmailChangedParams,
  SendProjectOAuthMagicLinkParams,
  SendProjectPasswordResetParams,
} from '@grantjs/core';
import type { EmailTemplates } from '@grantjs/email';

const stub = (): string => '';
const stubHtml = async (): Promise<string> => '';

/** Minimal stub templates for test-email: only OTP content is used; others return empty. */
export const emailTestTemplates: EmailTemplates = {
  getInvitationEmailSubject: (_: SendInvitationParams) => stub(),
  getInvitationEmailHtml: (_: SendInvitationParams) => stubHtml(),
  getInvitationEmailText: (_: SendInvitationParams) => stub(),
  getOtpEmailSubject: () => 'Grant Config – test email',
  getOtpEmailHtml: async () =>
    '<p>This is a test email from the Grant Platform config app. Your email provider is configured correctly.</p>',
  getOtpEmailText: () =>
    'This is a test email from the Grant Platform config app. Your email provider is configured correctly.',
  getPasswordResetEmailSubject: (_: SendPasswordResetParams) => stub(),
  getPasswordResetEmailHtml: (_: SendPasswordResetParams) => stubHtml(),
  getPasswordResetEmailText: (_: SendPasswordResetParams) => stub(),
  getProjectOAuthMagicLinkEmailSubject: (_: SendProjectOAuthMagicLinkParams) => stub(),
  getProjectOAuthMagicLinkEmailHtml: (_: SendProjectOAuthMagicLinkParams) => stubHtml(),
  getProjectOAuthMagicLinkEmailText: (_: SendProjectOAuthMagicLinkParams) => stub(),
  getProjectPasswordResetEmailSubject: (_: SendProjectPasswordResetParams) => stub(),
  getProjectPasswordResetEmailHtml: (_: SendProjectPasswordResetParams) => stubHtml(),
  getProjectPasswordResetEmailText: (_: SendProjectPasswordResetParams) => stub(),
  getProjectEmailChangedEmailSubject: (_: SendProjectEmailChangedParams) => stub(),
  getProjectEmailChangedEmailHtml: (_: SendProjectEmailChangedParams) => stubHtml(),
  getProjectEmailChangedEmailText: (_: SendProjectEmailChangedParams) => stub(),
};
