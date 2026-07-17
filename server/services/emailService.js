import nodemailer from 'nodemailer';

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendInquiryEmail = async ({ name, email, phone, businessName, subject, message }) => {
  const recipient = process.env.CONTACT_RECEIVER_EMAIL || 'jayaprakashnetha1@gmail.com';

  const isConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #ff9f1c; border-bottom: 2px solid #ff9f1c; padding-bottom: 10px;">New Business Inquiry</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone Number:</strong> ${phone || 'Not provided'}</p>
      <p><strong>Business Name:</strong> ${businessName || 'Not provided'}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #ff9f1c; font-style: italic;">
        ${message.replace(/\n/g, '<br/>')}
      </div>
      <p style="margin-top: 30px; font-size: 0.8rem; color: #888888; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 10px;">
        Sent from JP Creative NetWork website.
      </p>
    </div>
  `;

  if (isConfigured) {
    try {
      const transporter = getTransporter();

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"JP Creative NetWork Inquiry" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject: `[Inquiry] ${subject}`,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service] Message sent successfully: ${info.messageId}`);
      return true;
    } catch (err) {
      console.error('[Email Service] Error sending email via SMTP:', err);
      return false;
    }
  } else {
    console.log('========================================================================');
    console.log('[Email Service Fallback] SMTP details not configured in .env.');
    console.log(`[Email To]: ${recipient}`);
    console.log(`[Inquiry Details]:`);
    console.log(`- Sender: ${name} (${email})`);
    console.log(`- Phone: ${phone || 'N/A'}`);
    console.log(`- Business: ${businessName || 'N/A'}`);
    console.log(`- Subject: ${subject}`);
    console.log(`- Message:\n${message}`);
    console.log('========================================================================');
    return true;
  }
};

export const sendVerificationEmail = async ({ email, name, code }) => {
  const isConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #ff9f1c; border-bottom: 2px solid #ff9f1c; padding-bottom: 10px;">Verify Your Email Address</h2>
      <p>Hello ${name || 'User'},</p>
      <p>Thank you for registering with JP Creative NetWork. Please use the following One-Time Password (OTP) to verify your email address. This code is valid for 10 minutes.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; text-align: center; border: 1px dashed #ff9f1c; border-radius: 4px;">
        <span style="font-size: 2rem; font-weight: bold; letter-spacing: 5px; color: #ff9f1c;">${code}</span>
      </div>
      <p>If you did not initiate this request, please ignore this email.</p>
      <p style="margin-top: 30px; font-size: 0.8rem; color: #888888; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 10px;">
        Sent from JP Creative NetWork website.
      </p>
    </div>
  `;

  if (isConfigured) {
    try {
      const transporter = getTransporter();
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"JP Creative NetWork" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `[OTP] Verify Your Email Address`,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service] Verification OTP sent successfully: ${info.messageId}`);
      return true;
    } catch (err) {
      console.error('[Email Service] Error sending verification OTP via SMTP:', err);
      return false;
    }
  } else {
    console.log('========================================================================');
    console.log('[Email Service Fallback] SMTP details not configured in .env.');
    console.log(`[Verification OTP for ${email}]: ${code}`);
    console.log('========================================================================');
    return true;
  }
};

export const sendForgotPasswordEmail = async ({ email, name, code }) => {
  const isConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #ff9f1c; border-bottom: 2px solid #ff9f1c; padding-bottom: 10px;">Reset Your Password</h2>
      <p>Hello ${name || 'User'},</p>
      <p>We received a request to reset your password for your JP Creative NetWork account. Please use the following One-Time Password (OTP) to complete the reset. This code is valid for 10 minutes.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; text-align: center; border: 1px dashed #ff9f1c; border-radius: 4px;">
        <span style="font-size: 2rem; font-weight: bold; letter-spacing: 5px; color: #ff9f1c;">${code}</span>
      </div>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p style="margin-top: 30px; font-size: 0.8rem; color: #888888; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 10px;">
        Sent from JP Creative NetWork website.
      </p>
    </div>
  `;

  if (isConfigured) {
    try {
      const transporter = getTransporter();
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"JP Creative NetWork" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `[OTP] Password Reset Request`,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service] Password reset OTP sent successfully: ${info.messageId}`);
      return true;
    } catch (err) {
      console.error('[Email Service] Error sending password reset OTP via SMTP:', err);
      return false;
    }
  } else {
    console.log('========================================================================');
    console.log('[Email Service Fallback] SMTP details not configured in .env.');
    console.log(`[Password Reset OTP for ${email}]: ${code}`);
    console.log('========================================================================');
    return true;
  }
};

// Startup logs for email service configuration
console.log('=== EMAIL SERVICE STARTUP CONFIGURATION ===');
console.log(`EMAIL_USER configured: ${!!process.env.EMAIL_USER}`);
console.log(`EMAIL_PASS configured: ${!!process.env.EMAIL_PASS}`);
console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST || 'smtp.gmail.com (default)'}`);
console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT || '587 (default)'}`);
console.log('============================================');
