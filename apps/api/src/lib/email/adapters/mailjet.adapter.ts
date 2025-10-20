import Mailjet, { Client } from 'node-mailjet';

import { ApiError } from '@/lib/errors';

import { IEmailService, SendInvitationParams, SendOtpParams } from '../email.interface';
import {
  getInvitationEmailHtml,
  getInvitationEmailSubject,
  getInvitationEmailText,
  getOtpEmailHtml,
  getOtpEmailSubject,
  getOtpEmailText,
} from '../templates';

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

  constructor(private readonly config: MailjetConfig) {
    this.client = Mailjet.apiConnect(config.apiKey, config.secretKey);
    this.from = config.from;
    this.fromName = config.fromName || 'Grant Platform';
  }

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = getInvitationEmailSubject(params);
    const html = getInvitationEmailHtml(params);
    const text = getInvitationEmailText(params);

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
      console.error('Mailjet send error:', error);
      throw new ApiError(
        `Failed to send invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          statusCode: 500,
          code: 'EMAIL_SEND_FAILED',
          translationKey: 'errors:common.internalError',
        }
      );
    }
  }

  async sendOtp(params: SendOtpParams): Promise<void> {
    const subject = getOtpEmailSubject();
    const html = getOtpEmailHtml(params);
    const text = getOtpEmailText(params);

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
      console.error('Mailjet send error:', error);
      throw new ApiError(
        `Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          statusCode: 500,
          code: 'EMAIL_SEND_FAILED',
          translationKey: 'errors:common.internalError',
        }
      );
    }
  }
}
