import { SendOtpParams } from '../email.interface';

export function getOtpEmailSubject(): string {
  return 'Verify your email address';
}

export function getOtpEmailHtml(params: SendOtpParams): string {
  const { token } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
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
    .otp-code {
      background-color: #f3f4f6;
      border: 2px solid #2563eb;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .code {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #2563eb;
      font-family: 'Courier New', monospace;
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
    
    <h1>Verify your email address</h1>
    
    <p>Hi there,</p>
    
    <p>Use the verification code below to complete your registration:</p>
    
    <div class="otp-code">
      <div class="code">${token}</div>
    </div>
    
    <p style="text-align: center; font-size: 14px; color: #6b7280;">
      This code will expire in 15 minutes.
    </p>
    
    <div class="footer">
      <p>If you didn't request this code, you can safely ignore this email.</p>
      <p>Someone else might have typed your email address by mistake.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getOtpEmailText(params: SendOtpParams): string {
  const { token } = params;

  return `
Verify your email address

Hi there,

Use the verification code below to complete your registration:

${token}

This code will expire in 15 minutes.

If you didn't request this code, you can safely ignore this email.
Someone else might have typed your email address by mistake.

---
Grant Platform
  `.trim();
}
