// Re-export from @grantjs/email — canonical adapter implementations live there
export {
  ConsoleEmailAdapter,
  EmailFactory,
  MailgunEmailAdapter,
  MailjetEmailAdapter,
  SesEmailAdapter,
  SmtpEmailAdapter,
  type EmailTemplates,
} from '@grantjs/email';

// Re-export types from @grantjs/core
export type {
  IEmailService,
  SendInvitationParams,
  SendOtpParams,
  SendPasswordResetParams,
} from '@grantjs/core';

// Templates stay in the API
export * from './templates';
