import type { SendInvitationParams, SendOtpParams, SendPasswordResetParams } from '@grantjs/core';

/**
 * Template rendering functions that adapters use to produce email content.
 * The application provides its own implementation (e.g. MJML-based) at construction.
 */
export interface EmailTemplates {
  getInvitationEmailSubject(params: SendInvitationParams): string;
  getInvitationEmailHtml(params: SendInvitationParams): string;
  getInvitationEmailText(params: SendInvitationParams): string;
  getOtpEmailSubject(params: SendOtpParams): string;
  getOtpEmailHtml(params: SendOtpParams): string;
  getOtpEmailText(params: SendOtpParams): string;
  getPasswordResetEmailSubject(params: SendPasswordResetParams): string;
  getPasswordResetEmailHtml(params: SendPasswordResetParams): string;
  getPasswordResetEmailText(params: SendPasswordResetParams): string;
}
