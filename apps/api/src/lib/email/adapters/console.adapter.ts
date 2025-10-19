import { IEmailService, SendInvitationParams, SendOtpParams } from '../email.interface';
import {
  getInvitationEmailSubject,
  getInvitationEmailText,
  getOtpEmailSubject,
  getOtpEmailText,
} from '../templates';

/**
 * Console email adapter for development
 * Logs emails to console instead of actually sending them
 */
export class ConsoleEmailAdapter implements IEmailService {
  constructor(private readonly from: string) {}

  async sendInvitation(params: SendInvitationParams): Promise<void> {
    const subject = getInvitationEmailSubject(params);
    const text = getInvitationEmailText(params);

    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL (Console Adapter - Development Mode)');
    console.log('='.repeat(80));
    console.log(`From: ${this.from}`);
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${subject}`);
    console.log('-'.repeat(80));
    console.log(text);
    console.log('='.repeat(80) + '\n');
  }

  async sendOtp(params: SendOtpParams): Promise<void> {
    const subject = getOtpEmailSubject();
    const text = getOtpEmailText(params);

    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL (Console Adapter - Development Mode)');
    console.log('='.repeat(80));
    console.log(`From: ${this.from}`);
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${subject}`);
    console.log('-'.repeat(80));
    console.log(text);
    console.log('='.repeat(80) + '\n');
  }
}
