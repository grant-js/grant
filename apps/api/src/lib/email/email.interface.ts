export interface SendInvitationParams {
  to: string;
  organizationName: string;
  inviterName: string;
  invitationUrl: string;
  roleName: string;
}

export interface SendOtpParams {
  to: string;
  token: string;
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
}
