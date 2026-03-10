import { Resend } from 'resend';
export const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendTicketConfirmation(
  email: string,
  name: string | null,
  qrBuffer: Buffer,
  eventTitle: string,
  eventDate: Date | string
): Promise<void> {
  const formatted = new Date(eventDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#000;font-family:sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <tr><td>
      <p style="font-size:28px;font-weight:700;margin:0 0 4px;">${name ? `Hey ${name},` : 'Hey,'}</p>
      <p style="font-size:16px;font-weight:400;margin:0 0 32px;color:rgba(255,255,255,0.7);">You're in. Here's your ticket.</p>

      <p style="font-size:14px;margin:0 0 4px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;">Event</p>
      <p style="font-size:18px;font-weight:600;margin:0 0 4px;">${eventTitle}</p>
      <p style="font-size:14px;color:rgba(255,255,255,0.7);margin:0 0 32px;">${formatted}</p>

      <p style="font-size:13px;color:rgba(255,255,255,0.5);margin:0 0 12px;">Your entry QR code — present this at the venue:</p>
      <img src="cid:qr-code" width="220" height="220" alt="Entry QR" style="display:block;border-radius:8px;" />

      <p style="font-size:12px;color:rgba(255,255,255,0.4);margin:40px 0 0;">See you on the floor. — HMO</p>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: `You're in! 🎟 ${eventTitle}`,
    html,
    attachments: [
      {
        filename: 'qr.png',
        content: qrBuffer,
        contentId: 'qr-code',
      },
    ],
  });
}

export async function sendWaitlistInvite(
  email: string,
  name: string | null,
  eventTitle: string,
  eventDate: Date | string,
  appUrl: string
): Promise<void> {
  const formatted = new Date(eventDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#000;font-family:sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <tr><td>
      <p style="font-size:28px;font-weight:700;margin:0 0 4px;">${name ? `Hey ${name},` : 'Hey,'}</p>
      <p style="font-size:16px;font-weight:400;margin:0 0 32px;color:rgba(255,255,255,0.7);">You've been invited to buy a ticket.</p>

      <p style="font-size:14px;margin:0 0 4px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;">Event</p>
      <p style="font-size:18px;font-weight:600;margin:0 0 4px;">${eventTitle}</p>
      <p style="font-size:14px;color:rgba(255,255,255,0.7);margin:0 0 32px;">${formatted}</p>

      <p style="font-size:14px;color:rgba(255,255,255,0.7);margin:0 0 24px;">Log in to secure your spot before it's gone.</p>

      <a href="${appUrl}/login" style="display:inline-block;padding:14px 28px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:40px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">
        Get my ticket
      </a>

      <p style="font-size:12px;color:rgba(255,255,255,0.4);margin:40px 0 0;">See you on the floor. — HMO</p>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: `Now available to you — grab your ticket for ${eventTitle}`,
    html,
  });
}
