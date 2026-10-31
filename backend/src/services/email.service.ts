import nodemailer from 'nodemailer';

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      // Create an automatic Ethereal test account if credentials are not in env
      const testAccount = await nodemailer.createTestAccount();
      console.log('📧 Ethereal test email account created:', testAccount.user);

      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    })();
  }
  return transporterPromise;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
  clientUrl: string = process.env.CLIENT_URL || 'http://localhost:5173'
): Promise<{ success: boolean; previewUrl: string | false }> {
  try {
    const transporter = await getTransporter();
    const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;

    const info = await transporter.sendMail({
      from: '"Brightloop Software" <no-reply@brightloop.io>',
      to: toEmail,
      subject: 'Password Reset Request - Brightloop Software',
      text: `Hello,\n\nYou requested a password reset for your Brightloop account. Click the link below to set a new password:\n\n${resetLink}\n\nThis single-use link expires in 1 hour. If you did not request this, you can ignore this email.\n\nBest regards,\nBrightloop Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 16px;">Brightloop Software</h2>
          <p style="font-size: 16px; color: #334155;">Hello,</p>
          <p style="font-size: 15px; color: #334155; line-height: 1.5;">You recently requested to reset your password for your Brightloop account. Click the button below to proceed:</p>
          <div style="margin: 28px 0;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.4;">Or paste this link into your browser:<br /><a href="${resetLink}" style="color: #4f46e5;">${resetLink}</a></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">This is a single-use token valid for 1 hour. If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`✉️ Reset email sent to ${toEmail}`);
    if (previewUrl) {
      console.log(`🔗 Ethereal Email Preview URL: ${previewUrl}`);
    }

    return { success: true, previewUrl };
  } catch (err) {
    console.error('Error sending reset email:', err);
    throw err;
  }
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ success: boolean; previewUrl: string | false }> {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"Brightloop Software" <no-reply@brightloop.io>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Ethereal Email Preview URL: ${previewUrl}`);
    }
    return { success: true, previewUrl };
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
}
