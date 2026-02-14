import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';

import type {
  IEmailService,
  ILogger,
  SendInvitationParams,
  SendOtpParams,
  SendPasswordResetParams,
} from '@grantjs/core';
import { GrantException } from '@grantjs/core';

import type { EmailTemplates } from '../templates';

export interface SesConfig {
  clientId: string;
  clientSecret: string;
  region: string;
  from: string;
  fromName?: string;
}

/**
 * AWS SES email adapter
 * Sends emails using Amazon Simple Email Service (SES)
 */
export class SesEmailAdapter implements IEmailService {
  private readonly sesClient: SESClient;
  private readonly from: string;

  constructor(
    private readonly config: SesConfig,
    private readonly templates: EmailTemplates,
    private readonly logger: ILogger
  ) {
    this.sesClient = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.clientId,
        secretAccessKey: config.clientSecret,
      },
    });

    this.from = config.fromName ? `"${config.fromName}" <${config.from}>` : config.from;
  }

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = this.templates.getInvitationEmailSubject(params);
    const html = this.templates.getInvitationEmailHtml(params);
    const text = this.templates.getInvitationEmailText(params);

    try {
      const commandInput: SendEmailCommandInput = {
        Source: this.from,
        Destination: {
          ToAddresses: [params.to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          },
        },
      };

      const command = new SendEmailCommand(commandInput);
      await this.sesClient.send(command);
    } catch (error) {
      this.logger.error({
        msg: 'AWS SES send error',
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
      const commandInput: SendEmailCommandInput = {
        Source: this.from,
        Destination: {
          ToAddresses: [params.to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          },
        },
      };

      const command = new SendEmailCommand(commandInput);
      await this.sesClient.send(command);
    } catch (error) {
      this.logger.error({
        msg: 'AWS SES send error',
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
      const commandInput: SendEmailCommandInput = {
        Source: this.from,
        Destination: {
          ToAddresses: [params.to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          },
        },
      };

      const command = new SendEmailCommand(commandInput);
      await this.sesClient.send(command);
    } catch (error) {
      this.logger.error({
        msg: 'AWS SES send error',
        err: error,
        emailType: 'password-reset',
      });
      throw new GrantException(
        `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMAIL_SEND_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }
}
