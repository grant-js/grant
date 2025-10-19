import { SendInvitationParams } from '../email.interface';

export function getInvitationEmailSubject(params: SendInvitationParams): string {
  return `You've been invited to join ${params.organizationName}`;
}

export function getInvitationEmailHtml(params: SendInvitationParams): string {
  const { organizationName, inviterName, invitationUrl, roleName } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Organization Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      color: #1f2937;
    }
    p {
      margin-bottom: 15px;
      color: #4b5563;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 500;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .info-box {
      background-color: #f3f4f6;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Grant Platform</div>
    </div>
    
    <h1>You've been invited!</h1>
    
    <p>Hi there,</p>
    
    <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${roleName}</strong>.</p>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>Organization:</strong> ${organizationName}</p>
      <p style="margin: 10px 0 0 0;"><strong>Role:</strong> ${roleName}</p>
    </div>
    
    <p>Click the button below to accept the invitation and join the organization:</p>
    
    <div style="text-align: center;">
      <a href="${invitationUrl}" class="button">Accept Invitation</a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      If you're unable to click the button, copy and paste this URL into your browser:<br>
      <a href="${invitationUrl}" style="color: #2563eb; word-break: break-all;">${invitationUrl}</a>
    </p>
    
    <div class="footer">
      <p>This invitation will expire in 7 days.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getInvitationEmailText(params: SendInvitationParams): string {
  const { organizationName, inviterName, invitationUrl, roleName } = params;

  return `
You've been invited to join ${organizationName}

Hi there,

${inviterName} has invited you to join ${organizationName} as a ${roleName}.

Organization: ${organizationName}
Role: ${roleName}

Click the link below to accept the invitation:
${invitationUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

---
Grant Platform
  `.trim();
}
