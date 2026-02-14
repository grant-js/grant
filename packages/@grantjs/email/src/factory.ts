import type { IEmailService, ILogger, ILoggerFactory } from '@grantjs/core';
import { ConfigurationError } from '@grantjs/core';

import { ConsoleEmailAdapter } from './console';
import { MailgunConfig, MailgunEmailAdapter } from './mailgun';
import { MailjetConfig, MailjetEmailAdapter } from './mailjet';
import { SesConfig, SesEmailAdapter } from './ses';
import { SmtpConfig, SmtpEmailAdapter } from './smtp';
import type { EmailTemplates } from './templates';

/** Silent fallback when no logger factory is provided */
const noop = () => {};
const noopLogger: ILogger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => noopLogger,
};

export type EmailProvider = 'console' | 'mailgun' | 'mailjet' | 'ses' | 'smtp';

export interface EmailFactoryConfig {
  provider: EmailProvider;
  from: string;
  fromName?: string;
  mailgun?: Omit<MailgunConfig, 'from' | 'fromName'>;
  mailjet?: Omit<MailjetConfig, 'from' | 'fromName'>;
  ses?: Omit<SesConfig, 'from' | 'fromName'>;
  smtp?: Omit<SmtpConfig, 'from' | 'fromName'>;
}

/**
 * Factory for creating email service instances based on configuration
 */
export class EmailFactory {
  static createEmailService(
    config: EmailFactoryConfig,
    templates: EmailTemplates,
    loggerFactory?: ILoggerFactory
  ): IEmailService {
    const mkLogger = (name: string) => loggerFactory?.createLogger(name) ?? noopLogger;

    switch (config.provider) {
      case 'console':
        return new ConsoleEmailAdapter(config.from, templates, mkLogger('ConsoleEmailAdapter'));

      case 'mailgun':
        if (!config.mailgun) {
          throw new ConfigurationError(
            'Mailgun configuration is required when using mailgun adapter'
          );
        }
        return new MailgunEmailAdapter(
          {
            ...config.mailgun,
            from: config.from,
            fromName: config.fromName,
          },
          templates,
          mkLogger('MailgunEmailAdapter')
        );

      case 'mailjet':
        if (!config.mailjet) {
          throw new ConfigurationError(
            'Mailjet configuration is required when using mailjet adapter'
          );
        }
        return new MailjetEmailAdapter(
          {
            ...config.mailjet,
            from: config.from,
            fromName: config.fromName,
          },
          templates,
          mkLogger('MailjetEmailAdapter')
        );

      case 'ses':
        if (!config.ses) {
          throw new ConfigurationError('AWS SES configuration is required when using SES adapter');
        }
        return new SesEmailAdapter(
          {
            ...config.ses,
            from: config.from,
            fromName: config.fromName,
          },
          templates,
          mkLogger('SesEmailAdapter')
        );

      case 'smtp':
        if (!config.smtp) {
          throw new ConfigurationError('SMTP configuration is required when using smtp adapter');
        }
        return new SmtpEmailAdapter(
          {
            ...config.smtp,
            from: config.from,
            fromName: config.fromName,
          },
          templates,
          mkLogger('SmtpEmailAdapter')
        );

      default:
        throw new ConfigurationError(`Unknown email provider: ${config.provider}`);
    }
  }
}
