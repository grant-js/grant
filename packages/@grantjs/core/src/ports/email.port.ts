export interface SendInvitationParams {
  to: string;
  organizationName: string;
  inviterName: string;
  invitationUrl: string;
  roleName: string;
  expiresInDays?: number;
  locale?: string;
}

export interface SendOtpParams {
  to: string;
  token: string;
  validUntil: number;
  locale?: string;
}

export interface SendPasswordResetParams {
  to: string;
  token: string;
  validUntil: number;
  locale?: string;
}

export interface SendProjectOAuthMagicLinkParams {
  to: string;
  magicLinkUrl: string;
  appName?: string;
  locale?: string;
}

export interface SendProjectPasswordResetParams {
  to: string;
  /** Link to the hosted reset view; carries the one-time token. */
  resetUrl: string;
  /** Epoch milliseconds at which the link stops working. */
  validUntil: number;
  appName?: string;
  locale?: string;
}

/**
 * Notice that an administrator changed the sign-in e-mail of a project-app account.
 * Goes to the address the account used before the change. It carries no link and never
 * the new address: the person reading it is not proven to own the new one.
 */
export interface SendProjectEmailChangedParams {
  /** The previous address, the only recipient. */
  to: string;
  appName?: string;
  locale?: string;
}

export interface SendNotificationEmailParams {
  to: string;
  subject: string;
  /** Plain-text body (always provided). */
  text: string;
  /** Optional HTML body. */
  html?: string;
}

export interface IEmailService {
  /**
   * Send an organization invitation email
   */
  sendInvitation(params: SendInvitationParams): Promise<void>;

  /**
   * Send a one-time password (OTP) for email verification
   */
  sendOtp(params: SendOtpParams): Promise<void>;

  /**
   * Send a password reset email with reset token
   */
  sendPasswordReset(params: SendPasswordResetParams): Promise<void>;

  /**
   * Send a project OAuth magic link (sign-in link for project app)
   */
  sendProjectOAuthMagicLink(params: SendProjectOAuthMagicLinkParams): Promise<void>;

  /**
   * Send a project-app password reset link (ADR 0011 § 6), branded with the app's name
   */
  sendProjectPasswordReset(params: SendProjectPasswordResetParams): Promise<void>;

  /**
   * Send the notice to the previous address after an operator changed a project user's
   * login e-mail. No link and not the new address, branded with the app's name.
   */
  sendProjectEmailChanged(params: SendProjectEmailChangedParams): Promise<void>;

  /**
   * Send a generic notification email (subject + text/html body). Used by the
   * notification email channel.
   */
  sendNotification(params: SendNotificationEmailParams): Promise<void>;
}
