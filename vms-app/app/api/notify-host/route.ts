import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { visitor, hostEmail } = await request.json();

    const checkInTimeStr = new Date(visitor.check_in_time).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    // -------------------------------------------------------------
    // 1. Send Microsoft Teams / Power Automate Webhook Alert
    // -------------------------------------------------------------
    const teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL || '';
    if (teamsWebhookUrl) {
      try {
        const teamsPayload = {
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          themeColor: 'FFCC00', // HydraSpecma Gold
          summary: `Visitor Arrival: ${visitor.full_name}`,
          text: `🚨 **Visitor Check-In Alert**: **${visitor.full_name}** from **${visitor.company || 'N/A'}** has arrived to meet **${visitor.who_to_meet}** (${visitor.host_department || 'General'}) at ${checkInTimeStr} (IST). Pass ID: \`${visitor.pass_id}\`.`,
          sections: [
            {
              activityTitle: `🚨 Visitor Check-In Alert - ${visitor.full_name}`,
              activitySubtitle: `HydraSpecma India Visitor Management System`,
              activityImage: visitor.photo_url || 'https://vms-hydraspecma.vercel.app/favicon.ico',
              facts: [
                { name: 'Pass ID:', value: visitor.pass_id },
                { name: 'Visitor Name:', value: visitor.full_name },
                { name: 'Mobile:', value: visitor.mobile },
                { name: 'Company:', value: visitor.company || 'N/A' },
                { name: 'Host to Meet:', value: visitor.who_to_meet || 'N/A' },
                { name: 'Department:', value: visitor.host_department || 'General' },
                { name: 'Check-In Time:', value: `${checkInTimeStr} (IST)` },
              ],
              markdown: true,
            },
          ],
          // Extra direct properties for Power Automate workflow custom triggers
          pass_id: visitor.pass_id,
          full_name: visitor.full_name,
          mobile: visitor.mobile,
          company: visitor.company || 'N/A',
          who_to_meet: visitor.who_to_meet || 'N/A',
          host_department: visitor.host_department || 'General',
          check_in_time: `${checkInTimeStr} (IST)`,
          photo_url: visitor.photo_url || '',
        };

        const teamsRes = await fetch(teamsWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teamsPayload),
        });

        console.log('✅ Microsoft Teams / Power Automate notification sent status:', teamsRes.status);
      } catch (teamsErr) {
        console.error('Failed to send Teams / Power Automate notification:', teamsErr);
      }
    }

    // -------------------------------------------------------------
    // 2. Send Gmail / SMTP Host Alert
    // -------------------------------------------------------------
    const user = process.env.GMAIL_USER || process.env.SMTP_USER || '';
    const pass = process.env.GMAIL_APP_PASS || process.env.SMTP_PASS || '';
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const from = process.env.EMAIL_FROM || `Visitor Management <${user}>`;

    if (!hostEmail || !user || !pass) {
      console.warn('Gmail credentials missing, completing alert response');
      return NextResponse.json({ success: true, message: 'Teams / Power Automate webhook triggered successfully' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const attachments: any[] = [];
    let photoHtml = '';

    if (visitor.photo_url) {
      if (visitor.photo_url.startsWith('data:image')) {
        const base64Data = visitor.photo_url.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        attachments.push({
          filename: `${visitor.pass_id}.jpg`,
          content: buffer,
          cid: 'visitor_photo_cid',
        });
        photoHtml = `<img src="cid:visitor_photo_cid" alt="${visitor.full_name}" style="width: 130px; height: 130px; object-fit: cover; border-radius: 12px; border: 3px solid #ffcc00; display: block; margin: 0 auto;" />`;
      } else {
        attachments.push({
          filename: `${visitor.pass_id}.jpg`,
          path: visitor.photo_url,
          cid: 'visitor_photo_cid',
        });
        photoHtml = `<img src="cid:visitor_photo_cid" alt="${visitor.full_name}" style="width: 130px; height: 130px; object-fit: cover; border-radius: 12px; border: 3px solid #ffcc00; display: block; margin: 0 auto;" />`;
      }
    }

    const mailOptions = {
      from,
      to: hostEmail,
      subject: `[Visitor Arrival] ${visitor.full_name} has arrived to meet you`,
      attachments,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <!-- Corporate Header -->
          <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
            <h2 style="margin: 0; color: #ffcc00; font-size: 22px; font-weight: 800; tracking-wide: 1px;">HYDRASPECMA INDIA</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Visitor Check-In Alert</p>
          </div>

          <!-- Body Content -->
          <div style="padding: 24px; color: #334155;">
            <p style="font-size: 15px; margin-top: 0;">Hello,</p>
            <p style="font-size: 14px; line-height: 1.5;">
              Your visitor <strong style="color: #0f172a;">${visitor.full_name}</strong> from <strong>${visitor.company || 'N/A'}</strong> has checked in at reception.
            </p>
            
            ${
              photoHtml
                ? `<div style="text-align: center; margin: 20px 0; padding: 16px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
                    <p style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin: 0 0 10px 0;">Visitor Photo</p>
                    ${photoHtml}
                   </div>`
                : ''
            }

            <!-- Details Table -->
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 12px; font-size: 13px; overflow: hidden; border: 1px solid #e2e8f0;">
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 35%;">Pass ID:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 900; color: #0284c7;">${visitor.pass_id}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b;">Visitor Name:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${visitor.full_name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b;">Mobile:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${visitor.mobile}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b;">Company:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${visitor.company || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #64748b;">Purpose of Visit:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${visitor.purpose || 'General'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; color: #64748b;">Check-In Time:</td>
                <td style="padding: 12px 16px; color: #0f172a; font-weight: 600;">${checkInTimeStr} (IST)</td>
              </tr>
            </table>

            <p style="font-size: 13px; color: #475569; margin-bottom: 0;">
              Please meet your visitor at the main reception desk.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #0f172a; text-align: center; padding: 16px; font-size: 11px; color: #94a3b8;">
            HydraSpecma India Private Limited • Visitor Management System
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: 'Host notification sent via Teams and Gmail' });
  } catch (error: any) {
    console.error('Failed to send host notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
