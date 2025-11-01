import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

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

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  fromName?: string;
}

/**
 * SMTP email adapter using nodemailer
 */
export class SmtpEmailAdapter implements IEmailService {
  private readonly logger = createModuleLogger('SmtpEmailAdapter');
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;
  private from: string;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    this.from = config.fromName ? `"${config.fromName}" <${config.from}>` : config.from;
  }

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = getInvitationEmailSubject(params);
    const html = getInvitationEmailHtml(params);
    const text = getInvitationEmailText(params);

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: params.to,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error({
        msg: 'SMTP send error',
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
      await this.transporter.sendMail({
        from: this.from,
        to: params.to,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error({
        msg: 'SMTP send error',
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
      await this.transporter.sendMail({
        from: this.from,
        to: params.to,
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
