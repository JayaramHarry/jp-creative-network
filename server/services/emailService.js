import nodemailer from 'nodemailer';
import https from 'https';

const getTransporter = () => {
  const isSecure = process.env.EMAIL_PORT === '465';
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: isSecure, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Helper for making standard HTTP POST requests with Node native https module (zero-dependency)
const makeHttpRequest = (url, options, postData) => {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body });
        } else {
          reject(new Error(`HTTP Error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const sendViaBrevo = async (to, subject, htmlContent) => {
  const senderEmail = process.env.EMAIL_USER || 'noreply@jpcreative.com';
  const senderName = process.env.EMAIL_FROM ? process.env.EMAIL_FROM.split('<')[0].replace(/"/g, '').trim() : 'JP Creative NetWork';
  
  const options = {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const postData = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject: subject,
    htmlContent: htmlContent
  };

  await makeHttpRequest('https://api.brevo.com/v3/smtp/email', options, postData);
};

const sendViaResend = async (to, subject, htmlContent) => {
  const senderEmail = process.env.EMAIL_USER || 'onboarding@resend.dev';
  const senderName = process.env.EMAIL_FROM ? process.env.EMAIL_FROM.split('<')[0].replace(/"/g, '').trim() : 'JP Creative NetWork';

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  const postData = {
    from: `${senderName} <${senderEmail}>`,
    to: [to],
    subject: subject,
    html: htmlContent
  };

  await makeHttpRequest('https://api.resend.com/emails', options, postData);
};

const sendViaSendGrid = async (to, subject, htmlContent) => {
  const senderEmail = process.env.EMAIL_USER || 'noreply@jpcreative.com';
  const senderName = process.env.EMAIL_FROM ? process.env.EMAIL_FROM.split('<')[0].replace(/"/g, '').trim() : 'JP Creative NetWork';

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  const postData = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: senderEmail, name: senderName },
    subject: subject,
    content: [{ type: 'text/html', value: htmlContent }]
  };

  await makeHttpRequest('https://api.sendgrid.com/v3/mail/send', options, postData);
};

const dispatchEmail = async ({ to, subject, htmlContent }) => {
  try {
    if (process.env.BREVO_API_KEY) {
      console.log('[Email Service] Attempting delivery via Brevo HTTP API...');
      await sendViaBrevo(to, subject, htmlContent);
      console.log('[Email Service] Brevo HTTP API delivery successful.');
      return true;
    }
    
    if (process.env.RESEND_API_KEY) {
      console.log('[Email Service] Attempting delivery via Resend HTTP API...');
      await sendViaResend(to, subject, htmlContent);
      console.log('[Email Service] Resend HTTP API delivery successful.');
      return true;
    }

    if (process.env.SENDGRID_API_KEY) {
      console.log('[Email Service] Attempting delivery via SendGrid HTTP API...');
      await sendViaSendGrid(to, subject, htmlContent);
      console.log('[Email Service] SendGrid HTTP API delivery successful.');
      return true;
    }

    // Fallback to standard Nodemailer SMTP
    const isConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    if (isConfigured) {
      console.log('[Email Service] Attempting delivery via Nodemailer SMTP...');
      const transporter = getTransporter();
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"JP Creative NetWork" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: htmlContent,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service] SMTP delivery successful: ${info.messageId}`);
      return true;
    }

    // Fallback log for local dev
    console.log('========================================================================');
    console.log('[Email Service Fallback] No SMTP or HTTP API keys configured.');
    console.log(`[Email To]: ${to}`);
    console.log(`[Subject]: ${subject}`);
    console.log('========================================================================');
    return true;
  } catch (error) {
    console.error(`[Email Service] Delivery failed. Status: Failure. Reason: ${error.message}`);
    throw new Error('Email delivery failed');
  }
};

export const sendInquiryEmail = async ({ name, email, phone, businessName, subject, message }) => {
  const recipient = process.env.CONTACT_RECEIVER_EMAIL || 'jayaprakashnetha1@gmail.com';
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

  try {
    return await dispatchEmail({ to: recipient, subject: `[Inquiry] ${subject}`, htmlContent });
  } catch (err) {
    return false;
  }
};

export const sendVerificationEmail = async ({ email, name, code }) => {
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

  try {
    return await dispatchEmail({ to: email, subject: `[OTP] Verify Your Email Address`, htmlContent });
  } catch (err) {
    return false;
  }
};

export const sendForgotPasswordEmail = async ({ email, name, code }) => {
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

  try {
    return await dispatchEmail({ to: email, subject: `[OTP] Password Reset Request`, htmlContent });
  } catch (err) {
    return false;
  }
};

// Startup logs & SMTP verification for email service configuration
console.log('=== EMAIL SERVICE STARTUP DIAGNOSTICS ===');
console.log(`BREVO_API_KEY active: ${!!process.env.BREVO_API_KEY}`);
console.log(`RESEND_API_KEY active: ${!!process.env.RESEND_API_KEY}`);
console.log(`SENDGRID_API_KEY active: ${!!process.env.SENDGRID_API_KEY}`);
console.log(`EMAIL_USER configured: ${!!process.env.EMAIL_USER}`);
console.log(`EMAIL_PASS configured: ${!!process.env.EMAIL_PASS}`);
console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST || 'smtp.gmail.com (default)'}`);
console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT || '587 (default)'}`);

// Output selected provider
let selectedProvider = 'Using SMTP fallback';
if (process.env.BREVO_API_KEY) {
  selectedProvider = 'Using Brevo HTTP API';
} else if (process.env.RESEND_API_KEY) {
  selectedProvider = 'Using Resend HTTP API';
} else if (process.env.SENDGRID_API_KEY) {
  selectedProvider = 'Using SendGrid HTTP API';
}
console.log(`Selected Provider: ${selectedProvider}`);

if (process.env.EMAIL_USER && process.env.EMAIL_PASS && !process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
  console.log('[Email Service] Running SMTP connectivity test...');
  const transporter = getTransporter();
  transporter.verify((error, success) => {
    if (error) {
      console.warn('=== SMTP VERIFICATION WARNING ===');
      console.warn('Nodemailer connection verification failed:', error.message);
      console.warn('NOTE: Render blocks outbound SMTP ports (25, 465, 587) by default.');
      console.warn('To bypass this, configure BREVO_API_KEY, RESEND_API_KEY, or SENDGRID_API_KEY in Render.');
      console.warn('=================================');
    } else {
      console.log('[Email Service] SMTP verification successful. Ready to send emails.');
    }
  });
}
console.log('==========================================');
