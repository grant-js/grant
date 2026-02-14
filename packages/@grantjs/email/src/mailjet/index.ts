import Mailjet, { Client } from 'node-mailjet';

import type {
  IEmailService,
  ILogger,
  SendInvitationParams,
  SendOtpParams,
  SendPasswordResetParams,
} from '@grantjs/core';
import { GrantException } from '@grantjs/core';

import type { EmailTemplates } from '../templates';

export interface MailjetConfig {
  apiKey: string;
  secretKey: string;
  from: string;
  fromName?: string;
}

/**
 * Mailjet email adapter
 */
export class MailjetEmailAdapter implements IEmailService {
  private client: Client;
  private from: string;
  private fromName: string;

  constructor(
    private readonly config: MailjetConfig,
    private readonly templates: EmailTemplates,
    private readonly logger: ILogger
  ) {
    this.client = Mailjet.apiConnect(config.apiKey, config.secretKey);
    this.from = config.from;
    this.fromName = config.fromName || 'Grant';
  }

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = this.templates.getInvitationEmailSubject(params);
    const html = this.templates.getInvitationEmailHtml(params);
    const text = this.templates.getInvitationEmailText(params);

    try {
      await this.client.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: this.from,
              Name: this.fromName,
            },
            To: [
              {
                Email: params.to,
              },
            ],
            Subject: subject,
            TextPart: text,
            HTMLPart: html,
          },
        ],
      });
    } catch (error) {
      this.logger.error({
        msg: 'Mailjet send error',
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
      await this.client.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: this.from,
              Name: this.fromName,
            },
            To: [
              {
                Email: params.to,
              },
            ],
            Subject: subject,
            TextPart: text,
            HTMLPart: html,
          },
        ],
      });
    } catch (error) {
      this.logger.error({
        msg: 'Mailjet send error',
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
      await this.client.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: this.from,
              Name: this.fromName,
            },
            To: [
              {
                Email: params.to,
              },
            ],
            Subject: subject,
            TextPart: text,
            HTMLPart: html,
          },
        ],
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
