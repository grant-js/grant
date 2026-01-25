import Mailjet, { Client } from 'node-mailjet';

import { ApiError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';

import {
  IEmailService,
  SendInvitationParams,
  SendOtpParams,
  SendPasswordResetParams,
} from '../email.interface';
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
  private readonly logger = createModuleLogger('MailjetEmailAdapter');
  private client: Client;
  private from: string;
  private fromName: string;

  constructor(private readonly config: MailjetConfig) {
    this.client = Mailjet.apiConnect(config.apiKey, config.secretKey);
    this.from = config.from;
    this.fromName = config.fromName || 'Grant';
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
      this.logger.error({
        msg: 'Mailjet send error',
        err: error,
        emailType: 'invitation',
      });
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
    const subject = getOtpEmailSubject(params);
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
      this.logger.error({
        msg: 'Mailjet send error',
        err: error,
        emailType: 'otp',
      });
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

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    const subject = getPasswordResetEmailSubject(params);
    const html = getPasswordResetEmailHtml(params);
    const text = getPasswordResetEmailText(params);

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
      throw new ApiError(
        `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          statusCode: 500,
          code: 'EMAIL_SEND_FAILED',
          translationKey: 'errors:common.internalError',
        }
      );
    }
  }
}
