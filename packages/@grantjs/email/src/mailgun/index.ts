import FormData from 'form-data';
import Mailgun from 'mailgun.js';

import type {
  IEmailService,
  ILogger,
  SendInvitationParams,
  SendOtpParams,
  SendPasswordResetParams,
} from '@grantjs/core';
import { GrantException } from '@grantjs/core';

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
    const html = this.templates.getInvitationEmailHtml(params);
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
    const html = this.templates.getOtpEmailHtml(params);
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
    const html = this.templates.getPasswordResetEmailHtml(params);
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
}
