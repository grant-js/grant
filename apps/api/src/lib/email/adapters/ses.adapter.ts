import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';

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
  private readonly logger = createModuleLogger('SesEmailAdapter');
  private readonly sesClient: SESClient;
  private readonly from: string;

  constructor(private readonly config: SesConfig) {
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
    const subject = getInvitationEmailSubject(params);
    const html = getInvitationEmailHtml(params);
    const text = getInvitationEmailText(params);

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
