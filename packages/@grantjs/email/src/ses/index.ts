import { SendEmailCommand, SendEmailCommandInput, SESClient } from '@aws-sdk/client-ses';
import type {
  IEmailService,
  ILogger,
  SendInvitationParams,
  SendNotificationEmailParams,
  SendOtpParams,
  SendPasswordResetParams,
  SendProjectOAuthMagicLinkParams,
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
      // Static keys only when both are supplied. Left unset the SDK's default
      // credential chain applies, so a Lambda execution role or ECS task role signs
      // instead — which is the production path on AWS, where a long-lived access key
      // in an environment variable is the thing to avoid. Mirrors the S3 adapter.
      ...(config.clientId && config.clientSecret
        ? {
            credentials: {
              accessKeyId: config.clientId,
              secretAccessKey: config.clientSecret,
            },
          }
        : {}),
    });

    this.from = config.fromName ? `"${config.fromName}" <${config.from}>` : config.from;
  }

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = this.templates.getInvitationEmailSubject(params);
    const html = await this.templates.getInvitationEmailHtml(params);
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
    const html = await this.templates.getOtpEmailHtml(params);
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
    const html = await this.templates.getPasswordResetEmailHtml(params);
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

  async sendProjectOAuthMagicLink(params: SendProjectOAuthMagicLinkParams): Promise<void> {
    const subject = this.templates.getProjectOAuthMagicLinkEmailSubject(params);
    const html = await this.templates.getProjectOAuthMagicLinkEmailHtml(params);
    const text = this.templates.getProjectOAuthMagicLinkEmailText(params);

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
      throw new GrantException(
        `Failed to send project OAuth magic link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMAIL_SEND_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async sendNotification(params: SendNotificationEmailParams): Promise<void> {
    try {
      const commandInput: SendEmailCommandInput = {
        Source: this.from,
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: params.subject, Charset: 'UTF-8' },
          Body: {
            ...(params.html ? { Html: { Data: params.html, Charset: 'UTF-8' } } : {}),
            Text: { Data: params.text, Charset: 'UTF-8' },
          },
        },
      };
      await this.sesClient.send(new SendEmailCommand(commandInput));
    } catch (error) {
      throw new GrantException(
        `Failed to send notification email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMAIL_SEND_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }
}
