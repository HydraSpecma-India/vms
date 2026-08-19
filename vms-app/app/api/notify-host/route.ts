import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { visitor, hostEmail } = await request.json();

    if (!hostEmail) {
      return NextResponse.json({ message: 'No host email provided' }, { status: 400 });
    }

    const host = process.env.SMTP_HOST || 'smtp.office365.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const from = process.env.EMAIL_FROM || user;

    if (!user || !pass) {
      console.warn('SMTP credentials not configured, skipping email notification');
      return NextResponse.json({ message: 'SMTP not configured' }, { status: 200 });
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
      subject: `[Visitor Arrival] ${visitor.full_name} has checked in for you`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Visitor Check-In Notification</h2>
          </div>
          <div style="padding: 24px; color: #334155;">
            <p>Hello,</p>
            <p>Your visitor <strong>${visitor.full_name}</strong> has arrived and checked in at reception.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 6px;">
              <tr>
                <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Pass ID:</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${visitor.pass_id}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Visitor Name:</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${visitor.full_name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Mobile:</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${visitor.mobile}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Company:</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${visitor.company || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Purpose:</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${visitor.purpose || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Check-In Time:</td>
                <td style="padding: 10px;">${checkInTimeStr}</td>
              </tr>
            </table>

            <p>Please meet your visitor at the main reception desk.</p>
          </div>
          <div style="background-color: #f1f5f9; text-align: center; padding: 12px; font-size: 12px; color: #64748b;">
            Visitor Management System • HydraSpecma
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: 'Notification sent' });
  } catch (error: any) {
    console.error('Failed to send host notification email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
