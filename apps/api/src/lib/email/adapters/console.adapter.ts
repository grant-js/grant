import { createModuleLogger } from '@/lib/logger';

import {
  IEmailService,
  SendInvitationParams,
  SendOtpParams,
  SendPasswordResetParams,
} from '../email.interface';
import {
  getInvitationEmailSubject,
  getInvitationEmailText,
  getOtpEmailSubject,
  getOtpEmailText,
  getPasswordResetEmailSubject,
  getPasswordResetEmailText,
} from '../templates';

/**
 * Console email adapter for development
 * Logs emails to console instead of actually sending them
 */
export class ConsoleEmailAdapter implements IEmailService {
  private readonly logger = createModuleLogger('ConsoleEmailAdapter');

  constructor(private readonly from: string) {}

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = getInvitationEmailSubject(params);
    const text = getInvitationEmailText(params);

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
    const subject = getOtpEmailSubject(params);
    const text = getOtpEmailText(params);

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
    const subject = getPasswordResetEmailSubject(params);
    const text = getPasswordResetEmailText(params);

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
