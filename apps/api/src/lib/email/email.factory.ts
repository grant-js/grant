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
          throw new Error('Mailgun configuration is required when using mailgun adapter');
        }
        return new MailgunEmailAdapter({
          ...config.mailgun,
          from: config.from,
          fromName: config.fromName,
        });

      case 'mailjet':
        if (!config.mailjet) {
          throw new Error('Mailjet configuration is required when using mailjet adapter');
        }
        return new MailjetEmailAdapter({
          ...config.mailjet,
          from: config.from,
          fromName: config.fromName,
        });

      case 'smtp':
        if (!config.smtp) {
          throw new Error('SMTP configuration is required when using smtp adapter');
        }
        return new SmtpEmailAdapter({
          ...config.smtp,
          from: config.from,
          fromName: config.fromName,
        });

      default:
        throw new Error(`Unknown email provider: ${config.provider}`);
    }
  }
}
