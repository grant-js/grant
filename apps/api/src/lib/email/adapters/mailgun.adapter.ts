import FormData from 'form-data';
import Mailgun from 'mailgun.js';

import { IEmailService, SendInvitationParams, SendOtpParams } from '../email.interface';
import {
  getInvitationEmailHtml,
  getInvitationEmailSubject,
  getInvitationEmailText,
  getOtpEmailHtml,
  getOtpEmailSubject,
  getOtpEmailText,
} from '../templates';

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

  constructor(private readonly config: MailgunConfig) {
    const mailgun = new Mailgun(FormData);
    this.client = mailgun.client({
      username: 'api',
      key: config.apiKey,
    });

    this.from = config.fromName ? `${config.fromName} <${config.from}>` : config.from;
  }

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = getInvitationEmailSubject(params);
    const html = getInvitationEmailHtml(params);
    const text = getInvitationEmailText(params);

    try {
      await this.client.messages.create(this.config.domain, {
        from: this.from,
        to: params.to,
        subject,
        text,
        html,
      });
    } catch (error) {
      console.error('Mailgun send error:', error);
      throw new Error(
        `Failed to send invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async sendOtp(params: SendOtpParams): Promise<void> {
    const subject = getOtpEmailSubject();
    const html = getOtpEmailHtml(params);
    const text = getOtpEmailText(params);

    try {
      await this.client.messages.create(this.config.domain, {
        from: this.from,
        to: params.to,
        subject,
        text,
        html,
      });
    } catch (error) {
      console.error('Mailgun send error:', error);
      throw new Error(
        `Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
