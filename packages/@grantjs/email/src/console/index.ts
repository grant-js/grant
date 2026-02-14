import type {
  IEmailService,
  ILogger,
  SendInvitationParams,
  SendOtpParams,
  SendPasswordResetParams,
} from '@grantjs/core';

import type { EmailTemplates } from '../templates';

/**
 * Console email adapter for development
 * Logs emails to console instead of actually sending them
 */
export class ConsoleEmailAdapter implements IEmailService {
  constructor(
    private readonly from: string,
    private readonly templates: EmailTemplates,
    private readonly logger: ILogger
  ) {}

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = this.templates.getInvitationEmailSubject(params);
    const text = this.templates.getInvitationEmailText(params);

    this.logger.info({
      msg: '📧 EMAIL (Console Adapter - Development Mode)',
      emailType: 'invitation',
      from: this.from,
      to: params.to,
      subject,
      text,
    });
  }

  async sendOtp(params: SendOtpParams): Promise<void> {
    const subject = this.templates.getOtpEmailSubject(params);
    const text = this.templates.getOtpEmailText(params);

    this.logger.info({
      msg: '📧 EMAIL (Console Adapter - Development Mode)',
      emailType: 'otp',
      from: this.from,
      to: params.to,
      subject,
      text,
    });
  }

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    const subject = this.templates.getPasswordResetEmailSubject(params);
    const text = this.templates.getPasswordResetEmailText(params);

    this.logger.info({
      msg: '📧 PASSWORD RESET EMAIL (Console Adapter - Development Mode)',
      emailType: 'password-reset',
      from: this.from,
      to: params.to,
      subject,
      text,
    });
  }
}
