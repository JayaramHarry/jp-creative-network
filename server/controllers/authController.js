import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail, sendForgotPasswordEmail } from '../services/emailService.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'memoria_studio_super_secret_jwt_token_key_12345', {
    expiresIn: '30d',
  });
};

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const userCount = await User.countDocuments({});
    const role = userCount === 0 ? 'admin' : 'user';

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      name,
      email,
      password,
      role,
      emailVerificationCode: verificationCode,
      emailVerificationCodeExpires: verificationCodeExpires,
      isEmailVerified: false,
    });

    if (user) {
      if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[EMAIL VERIFICATION] OTP for ${user.email} is: ${verificationCode}`);
      }
      
      // Attempt to send email verification OTP in the background
      sendVerificationEmail({
        email: user.email,
        name: user.name,
        code: verificationCode
      }).catch(err => console.error('[Email OTP send error]:', err));

      res.status(201).json({
        success: true,
        message: 'Registration successful! Verification code sent to email.',
        email: user.email,
        ...(process.env.NODE_ENV === 'development' ? { testCode: verificationCode } : {}),
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = email.includes('@') ? { email: email.toLowerCase() } : { name: email };
    const user = await User.findOne(query).select('+password');

    if (user && (await user.matchPassword(password))) {
      if (!user.isEmailVerified) {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.emailVerificationCode = verificationCode;
        user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
          console.log(`[EMAIL VERIFICATION] OTP for unverified login ${user.email} is: ${verificationCode}`);
        }

        // Send verification email in the background
        sendVerificationEmail({
          email: user.email,
          name: user.name,
          code: verificationCode
        }).catch(err => console.error('[Email OTP send error]:', err));

        return res.status(403).json({
          success: false,
          message: 'Your email address is not verified. Please verify your email first.',
          email: user.email,
          isEmailVerified: false,
          ...(process.env.NODE_ENV === 'development' ? { testCode: verificationCode } : {}),
        });
      }

      res.json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Email address not found' });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetCode = resetCode;
    user.passwordResetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`[PASSWORD RESET] OTP for ${user.email} is: ${resetCode}`);
    }

    // Send forgot password email in the background
    sendForgotPasswordEmail({
      email: user.email,
      name: user.name,
      code: resetCode
    }).catch(err => console.error('[Email Reset OTP send error]:', err));

    res.json({
      success: true,
      message: 'A password reset code has been sent to your email address.',
      email: user.email,
      ...(process.env.NODE_ENV === 'development' ? { testCode: resetCode } : {}),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    if (user.emailVerificationCode !== code || new Date() > user.emailVerificationCodeExpires) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpires = undefined;
    await user.save();

    res.json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resendVerification = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = verificationCode;
    user.emailVerificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`[EMAIL VERIFICATION] Resent OTP for ${user.email} is: ${verificationCode}`);
    }

    // Send verification email in the background
    sendVerificationEmail({
      email: user.email,
      name: user.name,
      code: verificationCode
    }).catch(err => console.error('[Email Resend OTP send error]:', err));

    res.json({
      success: true,
      message: 'A new verification code has been sent to your email.',
      email: user.email,
      ...(process.env.NODE_ENV === 'development' ? { testCode: verificationCode } : {}),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.passwordResetCode !== code || new Date() > user.passwordResetCodeExpires) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    user.password = newPassword;
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
