import nodemailer from 'nodemailer';

// Create Office 365 transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.OFFICE365_EMAIL,
    pass: process.env.OFFICE365_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: true,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.OFFICE365_EMAIL || !process.env.OFFICE365_PASSWORD) {
    throw new Error('Office 365 email credentials not configured');
  }

  const mailOptions = {
    from: `"PSForge" <${process.env.OFFICE365_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || stripHtml(options.html),
  };

  await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  userName?: string
): Promise<void> {
  const subject = 'Reset Your PSForge Password';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .code {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">🔐 Password Reset Request</h1>
      </div>
      <div class="content">
        ${userName ? `<p>Hi ${userName},</p>` : '<p>Hello,</p>'}
        
        <p>We received a request to reset your PSForge password. Click the button below to create a new password:</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 13px;">
          ${resetUrl}
        </p>
        
        <div class="warning">
          <strong>⚠️ Important:</strong> This password reset link will expire in <strong>1 hour</strong> for security purposes.
        </div>
        
        <p><strong>Didn't request this?</strong> If you didn't ask to reset your password, you can safely ignore this email. Your password will remain unchanged.</p>
        
        <p>For security reasons, never share this link with anyone.</p>
      </div>
      <div class="footer">
        <p>This is an automated message from PSForge - PowerShell Script Builder</p>
        <p>© ${new Date().getFullYear()} PSForge. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request

${userName ? `Hi ${userName},` : 'Hello,'}

We received a request to reset your PSForge password.

To reset your password, visit this link:
${resetUrl}

This link will expire in 1 hour for security purposes.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

For security reasons, never share this link with anyone.

---
This is an automated message from PSForge - PowerShell Script Builder
© ${new Date().getFullYear()} PSForge. All rights reserved.
  `;

  await sendEmail({ to, subject, html, text });
}

export async function sendSupportRequestEmail(
  userEmail: string,
  userName: string | null,
  subject: string,
  message: string
): Promise<void> {
  const supportEmail = 'Support@psforge.app';
  const emailSubject = `[PSForge Support] ${subject}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
        }
        .user-info {
          background: #f9fafb;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          border-left: 4px solid #667eea;
        }
        .message-box {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 6px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0;">💬 New Support Request</h1>
      </div>
      <div class="content">
        <div class="user-info">
          <p style="margin: 0;"><strong>From:</strong> ${userName || 'User'} (${userEmail})</p>
          <p style="margin: 5px 0 0 0;"><strong>Subject:</strong> ${subject}</p>
        </div>
        
        <h3 style="margin-bottom: 10px;">Message:</h3>
        <div class="message-box">
${message}
        </div>
        
        <p style="margin-top: 20px; font-size: 13px; color: #6b7280;">
          To respond to this support request, reply directly to <a href="mailto:${userEmail}">${userEmail}</a>
        </p>
      </div>
      <div class="footer">
        <p>This is an automated message from PSForge - PowerShell Script Builder</p>
        <p>© ${new Date().getFullYear()} PSForge. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
New Support Request

From: ${userName || 'User'} (${userEmail})
Subject: ${subject}

Message:
${message}

---
To respond to this support request, reply directly to ${userEmail}

This is an automated message from PSForge - PowerShell Script Builder
© ${new Date().getFullYear()} PSForge. All rights reserved.
  `;

  await sendEmail({ 
    to: supportEmail, 
    subject: emailSubject, 
    html, 
    text 
  });
}

// Helper function to strip HTML tags for plain text version
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function sendWelcomeEmail(
  to: string,
  userName: string | null,
  templateHtml: string,
  templateSubject: string
): Promise<void> {
  // Replace placeholders in template
  const userDisplayName = userName || 'there';
  const replacedHtml = templateHtml
    .replace(/\{userName\}/g, userDisplayName)
    .replace(/\{userEmail\}/g, to)
    .replace(/\{year\}/g, new Date().getFullYear().toString());
  
  const replacedSubject = templateSubject
    .replace(/\{userName\}/g, userDisplayName)
    .replace(/\{userEmail\}/g, to);

  await sendEmail({ 
    to, 
    subject: replacedSubject, 
    html: replacedHtml 
  });
}

// Verify email configuration on startup
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    if (!process.env.OFFICE365_EMAIL || !process.env.OFFICE365_PASSWORD) {
      console.warn('⚠️  Office 365 email credentials not configured. Password reset emails will not be sent.');
      return false;
    }
    
    await transporter.verify();
    console.log('✓ Office 365 email service configured successfully');
    return true;
  } catch (error) {
    console.error('✗ Office 365 email configuration error:', error);
    return false;
  }
}
