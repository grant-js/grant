import { EmailFactory } from '@grantjs/email';

import { config } from '@/config';
import {
  getInvitationEmailHtml,
  getInvitationEmailSubject,
  getInvitationEmailText,
  getOtpEmailHtml,
  getOtpEmailSubject,
  getOtpEmailText,
  getPasswordResetEmailHtml,
  getPasswordResetEmailSubject,
  getPasswordResetEmailText,
} from '@/lib/email/templates';
import { loggerFactory } from '@/lib/logger';

import type { IEmailService, SendInvitationParams } from '@grantjs/core';
import type { EmailTemplates } from '@grantjs/email';

/** API-specific template implementation wrapping MJML template functions */
const templates: EmailTemplates = {
  getInvitationEmailSubject,
  getInvitationEmailHtml,
  getInvitationEmailText,
  getOtpEmailSubject,
  getOtpEmailHtml,
  getOtpEmailText,
  getPasswordResetEmailSubject,
  getPasswordResetEmailHtml,
  getPasswordResetEmailText,
};

/**
 * Email Service
 * Provides a centralized email service instance for the application
 */
export class EmailService implements IEmailService {
  private emailAdapter: IEmailService;

  constructor() {
    // Initialize email service using factory, injecting templates and logger
    this.emailAdapter = EmailFactory.createEmailService(
      {
        provider: config.email.provider,
        from: config.email.from,
        fromName: config.email.fromName,
        mailgun:
          config.email.provider === 'mailgun'
            ? {
                apiKey: config.email.mailgun.apiKey,
                domain: config.email.mailgun.domain,
              }
            : undefined,
        mailjet:
          config.email.provider === 'mailjet'
            ? {
                apiKey: config.email.mailjet.apiKey,
                secretKey: config.email.mailjet.secretKey,
              }
            : undefined,
        ses:
          config.email.provider === 'ses'
            ? {
                clientId: config.email.ses.clientId,
                clientSecret: config.email.ses.clientSecret,
                region: config.email.ses.region,
              }
            : undefined,
        smtp:
          config.email.provider === 'smtp'
            ? {
                host: config.email.smtp.host,
                port: config.email.smtp.port,
                secure: config.email.smtp.secure,
                auth: {
                  user: config.email.smtp.user,
                  pass: config.email.smtp.password,
                },
              }
            : undefined,
      },
      templates,
      loggerFactory
    );
  }

  /**
   * Get the email adapter instance
   */
  public getAdapter(): IEmailService {
    return this.emailAdapter;
  }

  /**
   * Send an invitation email
   */
  public async sendInvitation(params: SendInvitationParams): Promise<void> {
    return this.emailAdapter.sendInvitation(params);
  }

  /**
   * Send an OTP email
   */
  public async sendOtp(params: {
    to: string;
    token: string;
    validUntil: number;
    locale?: string;
  }): Promise<void> {
    return this.emailAdapter.sendOtp(params);
  }

  /**
   * Send a password reset email
   */
  public async sendPasswordReset(params: {
    to: string;
    token: string;
    validUntil: number;
    locale?: string;
  }): Promise<void> {
    return this.emailAdapter.sendPasswordReset(params);
  }
}
