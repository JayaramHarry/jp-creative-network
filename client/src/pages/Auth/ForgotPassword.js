import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.js';
import './Auth.css';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: request code, 2: reset password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [testCode, setTestCode] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);

  const { forgotPassword, resetPassword } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');

    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    try {
      setLoadingLocal(true);
      const res = await forgotPassword(email);
      if (res.success) {
        setStatusMsg(res.message);
        if (res.testCode) {
          setTestCode(res.testCode);
        }
        setStep(2);
      } else {
        setErrorMsg(res.message || 'Reset code request failed.');
      }
    } catch (err) {
      setErrorMsg('Something went wrong. Please check your network and try again.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    setErrorMsg('');

    if (!code || code.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit reset code.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      setLoadingLocal(true);
      const res = await resetPassword(email, code, newPassword);
      if (res.success) {
        setStatusMsg(res.message || 'Password reset successful!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setErrorMsg(res.message || 'Password reset failed.');
      }
    } catch (err) {
      setErrorMsg('Something went wrong. Please check your network and try again.');
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <div className="auth-page fade-in-up">
      <div className="auth-container glass-card">
        <h2 className="auth-title">Reset <span>Password</span></h2>
        <p className="auth-subtitle">
          {step === 1 
            ? "Enter your email and we'll send a password recovery code" 
            : `Enter the 6-digit recovery code sent to ${email} and your new password`}
        </p>

        {statusMsg && <div className="auth-alert alert-success">{statusMsg}</div>}
        {errorMsg && <div className="auth-alert alert-danger">{errorMsg}</div>}

        {testCode && step === 2 && (
          <div className="auth-alert alert-success" style={{ textAlign: 'center', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}>
            <strong>💡 Testing Helper:</strong> Your password reset code is <code>{testCode}</code>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loadingLocal}>
              {loadingLocal ? 'Sending request...' : 'Send Recovery Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label className="form-label">Recovery Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '1.4rem', fontWeight: 'bold' }}
              />
            </div>

             <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div className="show-password-container">
                <input
                  type="checkbox"
                  id="show-password-forgot"
                  className="show-password-checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                />
                <label htmlFor="show-password-forgot" className="show-password-label">
                  Show Password
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loadingLocal}>
              {loadingLocal ? 'Resetting password...' : 'Reset Password'}
            </button>

            <button 
              type="button" 
              className="btn btn-secondary auth-submit" 
              onClick={() => {
                setStep(1);
                setStatusMsg('');
                setErrorMsg('');
                setTestCode('');
              }}
              style={{ marginTop: '10px' }}
            >
              Go Back
            </button>
          </form>
        )}

        <p className="auth-footer">
          Remember your password? <Link to="/login">Log in here</Link>
        </p>
      </div>
    </div>
  );
}
