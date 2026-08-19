import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { visitor, hostEmail } = await request.json();

    if (!hostEmail) {
      return NextResponse.json({ message: 'No host email provided' }, { status: 400 });
    }

    // Gmail SMTP credentials or standard fallback
    const user = process.env.GMAIL_USER || process.env.SMTP_USER || '';
    const pass = process.env.GMAIL_APP_PASS || process.env.SMTP_PASS || '';
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const from = process.env.EMAIL_FROM || `Visitor Management <${user}>`;

    if (!user || !pass) {
      console.warn('Gmail / SMTP credentials not configured, skipping email alert');
      return NextResponse.json({ message: 'SMTP credentials missing' }, { status: 200 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const checkInTimeStr = new Date(visitor.check_in_time).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const mailOptions = {
      from,
      to: hostEmail,
      subject: `[Visitor Arrival] ${visitor.full_name} has arrived to meet you`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
            <h2 style="margin: 0; color: #ffcc00; font-size: 20px;">HydraSpecma Visitor Alert</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Visitor Check-In Notification</p>
          </div>
          <div style="padding: 24px; color: #334155;">
            <p style="font-size: 14px;">Hello,</p>
            <p style="font-size: 14px;">Your visitor <strong>${visitor.full_name}</strong> from <strong>${visitor.company || 'N/A'}</strong> has checked in at reception.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; font-size: 13px;">
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b;">Pass ID:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #0284c7;">${visitor.pass_id}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b;">Visitor Name:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${visitor.full_name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b;">Mobile:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${visitor.mobile}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b;">Purpose of Visit:</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${visitor.purpose || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; color: #64748b;">Check-In Time:</td>
                <td style="padding: 10px 14px;">${checkInTimeStr}</td>
              </tr>
            </table>

            <p style="font-size: 13px; color: #475569;">Please meet your visitor at the main reception desk.</p>
          </div>
          <div style="background-color: #0f172a; text-align: center; padding: 14px; font-size: 11px; color: #94a3b8;">
            HydraSpecma India Private Limited • Visitor Management System
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: 'Gmail notification sent to host' });
  } catch (error: any) {
    console.error('Failed to send Gmail host notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
