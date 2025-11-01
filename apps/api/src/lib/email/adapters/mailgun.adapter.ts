import FormData from 'form-data';
import Mailgun from 'mailgun.js';

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
  private readonly logger = createModuleLogger('MailgunEmailAdapter');
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
      this.logger.error({
        msg: 'Mailgun send error',
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
      await this.client.messages.create(this.config.domain, {
        from: this.from,
        to: [params.to],
        subject,
        text,
        html,
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
