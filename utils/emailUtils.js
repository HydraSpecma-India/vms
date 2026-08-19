const nodemailer = require('nodemailer');
const loadConfig = require('./configLoader');
const config = loadConfig();

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.auth.user,
    pass: config.smtp.auth.pass,
  },
});

/**
 * Send an email notification when a visitor arrives.
 * It sends an email to the host, and to the visitor (if the visitor provided an email).
 * 
 * @param {Object} visitor - The visitor record
 * @param {string} hostEmail - The email address of the host
 */
async function sendCheckInNotification(visitor, hostEmail) {
  // If the user hasn't configured SMTP yet (placeholder still exists), we skip sending
  // to avoid crashing the server.
  if (config.smtp.auth.user === 'your_email@domain.com') {
    console.log('Skipping email notification: SMTP credentials not configured in config.json.');
    return;
  }

  const visitorName = visitor.fullName;
  const company = visitor.company || 'N/A';
  const purpose = visitor.purpose || 'Meeting';
  const passId = visitor.passId;

  // 1. Notify the host
  if (hostEmail) {
    const hostMailOptions = {
      from: config.emailFrom || '"Visitor Management" <noreply@domain.com>',
      to: hostEmail,
      subject: `Visitor Arrival Notification: ${visitorName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Your Visitor Has Arrived</h2>
          <p>Hello,</p>
          <p>Your visitor, <strong>${visitorName}</strong> from <strong>${company}</strong>, has arrived at the reception.</p>
          <ul>
            <li><strong>Pass ID:</strong> ${passId}</li>
            <li><strong>Purpose:</strong> ${purpose}</li>
          </ul>
          <p>Please make your way to the reception to greet them.</p>
          <br>
          <p>Thank you,<br>Visitor Management System</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(hostMailOptions);
      console.log(`Notification email sent to host: ${hostEmail}`);
    } catch (err) {
      console.error('Failed to send email to host:', err);
    }
  }

  // 2. Notify the visitor (if email provided)
  if (visitor.email) {
    const visitorMailOptions = {
      from: config.emailFrom || '"Visitor Management" <noreply@domain.com>',
      to: visitor.email,
      subject: `Welcome! Your Visitor Pass ID: ${passId}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Welcome to Our Office</h2>
          <p>Hello ${visitorName},</p>
          <p>Thank you for checking in. We have notified your host.</p>
          <p>Your Visitor Pass ID is: <strong>${passId}</strong></p>
          <p>Please keep this ID handy for when you sign out.</p>
          <br>
          <p>Thank you,<br>Visitor Management System</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(visitorMailOptions);
      console.log(`Welcome email sent to visitor: ${visitor.email}`);
    } catch (err) {
      console.error('Failed to send email to visitor:', err);
    }
  }
}

module.exports = {
  sendCheckInNotification
};
