import { config } from '@/config';
import { EmailFactory, IEmailService, SendInvitationParams } from '@/lib/email';

/**
 * Email Service
 * Provides a centralized email service instance for the application
 */
export class EmailService {
  private emailAdapter: IEmailService;

  constructor() {
    // Initialize email service using factory
    this.emailAdapter = EmailFactory.createEmailService({
      provider: config.email.provider,
      from: config.email.from,
      fromName: config.email.fromName,
      mailgun:
        config.email.provider === 'mailgun'
          ? {
              apiKey: config.email.mailgun.apiKey,
              domain: config.email.mailgun.domain,
            }
          : undefined,
      mailjet:
        config.email.provider === 'mailjet'
          ? {
              apiKey: config.email.mailjet.apiKey,
              secretKey: config.email.mailjet.secretKey,
            }
          : undefined,
      smtp:
        config.email.provider === 'smtp'
          ? {
              host: config.email.smtp.host,
              port: config.email.smtp.port,
              secure: config.email.smtp.secure,
              auth: {
                user: config.email.smtp.user,
                pass: config.email.smtp.password,
              },
            }
          : undefined,
    });
  }

  /**
   * Get the email adapter instance
   */
  public getAdapter(): IEmailService {
    return this.emailAdapter;
  }

  /**
   * Send an invitation email
   */
  public async sendInvitation(params: SendInvitationParams): Promise<void> {
    return this.emailAdapter.sendInvitation(params);
  }

  /**
   * Send an OTP email
   */
  public async sendOtp(params: {
    to: string;
    token: string;
    validUntil: number;
    locale?: string;
  }): Promise<void> {
    return this.emailAdapter.sendOtp(params);
  }

  /**
   * Send a password reset email
   */
  public async sendPasswordReset(params: {
    to: string;
    token: string;
    validUntil: number;
    locale?: string;
  }): Promise<void> {
    return this.emailAdapter.sendPasswordReset(params);
  }
}
