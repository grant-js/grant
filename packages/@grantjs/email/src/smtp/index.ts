import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

import type {
  IEmailService,
  ILogger,
  SendInvitationParams,
  SendOtpParams,
  SendPasswordResetParams,
} from '@grantjs/core';
import { GrantException } from '@grantjs/core';

import type { EmailTemplates } from '../templates';

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
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;
  private from: string;

  constructor(
    private readonly config: SmtpConfig,
    private readonly templates: EmailTemplates,
    private readonly logger: ILogger
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    this.from = config.fromName ? `"${config.fromName}" <${config.from}>` : config.from;
  }

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = this.templates.getInvitationEmailSubject(params);
    const html = this.templates.getInvitationEmailHtml(params);
    const text = this.templates.getInvitationEmailText(params);

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
      await this.transporter.sendMail({
        from: this.from,
        to: params.to,
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
