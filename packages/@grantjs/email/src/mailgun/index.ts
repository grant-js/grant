import type {
  IEmailService,
  ILogger,
  SendInvitationParams,
  SendNotificationEmailParams,
  SendOtpParams,
  SendPasswordResetParams,
  SendProjectOAuthMagicLinkParams,
} from '@grantjs/core';
import { GrantException } from '@grantjs/core';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

import type { EmailTemplates } from '../templates';

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  from: string;
  fromName?: string;
}

/**
 * Mailgun email adapter
 */
export class MailgunEmailAdapter implements IEmailService {
  private client: ReturnType<Mailgun['client']>;
  private from: string;

  constructor(
    private readonly config: MailgunConfig,
    private readonly templates: EmailTemplates,
    private readonly logger: ILogger
  ) {
    const mailgun = new Mailgun(FormData);
    this.client = mailgun.client({
      username: 'api',
      key: config.apiKey,
    });

    this.from = config.fromName ? `${config.fromName} <${config.from}>` : config.from;
  }

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = this.templates.getInvitationEmailSubject(params);
    const html = await this.templates.getInvitationEmailHtml(params);
    const text = this.templates.getInvitationEmailText(params);

    try {
      await this.client.messages.create(this.config.domain, {
        from: this.from,
        to: params.to,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error({
        msg: 'Mailgun send error',
        err: error,
        emailType: 'invitation',
      });
      throw new GrantException(
        `Failed to send invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMAIL_SEND_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async sendOtp(params: SendOtpParams): Promise<void> {
    const subject = this.templates.getOtpEmailSubject(params);
    const html = await this.templates.getOtpEmailHtml(params);
    const text = this.templates.getOtpEmailText(params);

    try {
      await this.client.messages.create(this.config.domain, {
        from: this.from,
        to: params.to,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error({
        msg: 'Mailgun send error',
        err: error,
        emailType: 'otp',
      });
      throw new GrantException(
        `Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMAIL_SEND_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    const subject = this.templates.getPasswordResetEmailSubject(params);
    const html = await this.templates.getPasswordResetEmailHtml(params);
    const text = this.templates.getPasswordResetEmailText(params);

    try {
      await this.client.messages.create(this.config.domain, {
        from: this.from,
        to: [params.to],
        subject,
        text,
        html,
      });
    } catch (error) {
      throw new GrantException(
        `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMAIL_SEND_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async sendProjectOAuthMagicLink(params: SendProjectOAuthMagicLinkParams): Promise<void> {
    const subject = this.templates.getProjectOAuthMagicLinkEmailSubject(params);
    const html = await this.templates.getProjectOAuthMagicLinkEmailHtml(params);
    const text = this.templates.getProjectOAuthMagicLinkEmailText(params);

    try {
      await this.client.messages.create(this.config.domain, {
        from: this.from,
        to: [params.to],
        subject,
        text,
        html,
      });
    } catch (error) {
      throw new GrantException(
        `Failed to send project OAuth magic link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMAIL_SEND_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async sendNotification(params: SendNotificationEmailParams): Promise<void> {
    try {
      await this.client.messages.create(this.config.domain, {
        from: this.from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
    } catch (error) {
      throw new GrantException(
        `Failed to send notification email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMAIL_SEND_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }
}
