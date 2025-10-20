import { BadRequestError } from '@/lib/errors';

import { ConsoleEmailAdapter } from './adapters/console.adapter';
import { MailgunConfig, MailgunEmailAdapter } from './adapters/mailgun.adapter';
import { MailjetConfig, MailjetEmailAdapter } from './adapters/mailjet.adapter';
import { SmtpConfig, SmtpEmailAdapter } from './adapters/smtp.adapter';
import { IEmailService } from './email.interface';

export type EmailProvider = 'console' | 'mailgun' | 'mailjet' | 'smtp';

export interface EmailFactoryConfig {
  provider: EmailProvider;
  from: string;
  fromName?: string;
  mailgun?: Omit<MailgunConfig, 'from' | 'fromName'>;
  mailjet?: Omit<MailjetConfig, 'from' | 'fromName'>;
  smtp?: Omit<SmtpConfig, 'from' | 'fromName'>;
}

/**
 * Factory for creating email service instances based on configuration
 */
export class EmailFactory {
  static createEmailService(config: EmailFactoryConfig): IEmailService {
    switch (config.provider) {
      case 'console':
        return new ConsoleEmailAdapter(config.from);

      case 'mailgun':
        if (!config.mailgun) {
          throw new BadRequestError(
            'Mailgun configuration is required when using mailgun adapter',
            'errors:validation.required',
            { field: 'mailgun' }
          );
        }
        return new MailgunEmailAdapter({
          ...config.mailgun,
          from: config.from,
          fromName: config.fromName,
        });

      case 'mailjet':
        if (!config.mailjet) {
          throw new BadRequestError(
            'Mailjet configuration is required when using mailjet adapter',
            'errors:validation.required',
            { field: 'mailjet' }
          );
        }
        return new MailjetEmailAdapter({
          ...config.mailjet,
          from: config.from,
          fromName: config.fromName,
        });

      case 'smtp':
        if (!config.smtp) {
          throw new BadRequestError(
            'SMTP configuration is required when using smtp adapter',
            'errors:validation.required',
            { field: 'smtp' }
          );
        }
        return new SmtpEmailAdapter({
          ...config.smtp,
          from: config.from,
          fromName: config.fromName,
        });

      default:
        throw new BadRequestError(
          `Unknown email provider: ${config.provider}`,
          'errors:validation.invalid',
          { field: 'provider' }
        );
    }
  }
}
