import { NextRequest, NextResponse } from 'next/server';

import { EmailFactory } from '@grantjs/email';

import { emailTestTemplates } from '@/lib/email-test-templates';
import { emailTestParamsSchema } from '@/lib/env-schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = emailTestParamsSchema.safeParse(body ?? {});
    if (!parsed.success) {
      const first = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      return NextResponse.json(
        { ok: false, error: typeof first === 'string' ? first : 'Invalid email test params' },
        { status: 400 }
      );
    }
    const { to, provider, from, fromName, mailgun, mailjet, ses, smtp } = parsed.data;

    switch (provider) {
      case 'mailgun':
        if (!mailgun?.apiKey || !mailgun?.domain) {
          return NextResponse.json(
            { ok: false, error: 'Mailgun API key and domain are required' },
            { status: 400 }
          );
        }
        break;
      case 'mailjet':
        if (!mailjet?.apiKey || !mailjet?.secretKey) {
          return NextResponse.json(
            { ok: false, error: 'Mailjet API key and secret key are required' },
            { status: 400 }
          );
        }
        break;
      case 'ses':
        if (!ses?.clientId || !ses?.clientSecret || !ses?.region) {
          return NextResponse.json(
            { ok: false, error: 'SES client ID, secret, and region are required' },
            { status: 400 }
          );
        }
        break;
      case 'smtp':
        if (!smtp?.host || !smtp?.user || smtp?.password === undefined) {
          return NextResponse.json(
            { ok: false, error: 'SMTP host, user, and password are required' },
            { status: 400 }
          );
        }
        break;
    }

    const config = {
      provider,
      from,
      fromName: fromName || undefined,
      mailgun:
        provider === 'mailgun' && mailgun
          ? { apiKey: mailgun.apiKey, domain: mailgun.domain }
          : undefined,
      mailjet:
        provider === 'mailjet' && mailjet
          ? { apiKey: mailjet.apiKey, secretKey: mailjet.secretKey }
          : undefined,
      ses:
        provider === 'ses' && ses
          ? {
              clientId: ses.clientId,
              clientSecret: ses.clientSecret,
              region: ses.region,
            }
          : undefined,
      smtp:
        provider === 'smtp' && smtp
          ? {
              host: smtp.host,
              port: smtp.port,
              // Port 465 = implicit TLS; 587/25 = STARTTLS (secure: false, nodemailer upgrades)
              secure: smtp.port === 465,
              auth: { user: smtp.user, pass: smtp.password },
            }
          : undefined,
    };

    const emailService = EmailFactory.createEmailService(config, emailTestTemplates);
    await emailService.sendOtp({
      to,
      token: 'test',
      validUntil: Date.now() + 3600_000,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Failed to send test email';
    const isRelay =
      /553|relay|sender.*not.*allowed|not allowed to relay/i.test(raw) ||
      (err instanceof Error && err.message?.includes('relay'));
    const message = isRelay
      ? `${raw} (Tip: many SMTP servers require the From address to match the authenticated user—ensure EMAIL_FROM equals or is allowed by your SMTP server.)`
      : raw;
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
