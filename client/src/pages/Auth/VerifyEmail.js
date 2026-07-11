import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.js';
import './Auth.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState('');
  const [testCode, setTestCode] = useState(initialCode);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);
  
  // Resend code countdown timer
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { verifyEmail, resendVerificationCode } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) {
      setErrorMsg('Invalid request. No email address provided.');
    }
  }, [email]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!code || code.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit verification code.');
      return;
    }

    try {
      setLoadingLocal(true);
      const res = await verifyEmail(email, code);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setErrorMsg(res.message || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      setErrorMsg('Something went wrong. Please check your network and try again.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await resendVerificationCode(email);
      if (res.success) {
        setSuccessMsg(res.message || 'A new verification code has been sent!');
        if (res.testCode) {
          setTestCode(res.testCode);
        }
        setCountdown(60);
        setCanResend(false);
      } else {
        setErrorMsg(res.message || 'Failed to resend verification code.');
      }
    } catch (err) {
      setErrorMsg('Failed to resend. Please try again.');
    }
  };

  return (
    <div className="auth-page fade-in-up">
      <div className="auth-container glass-card">
        <h2 className="auth-title">Verify your <span>Email</span></h2>
        <p className="auth-subtitle">We have sent a 6-digit verification code to <strong>{email}</strong></p>

        {successMsg && <div className="auth-alert alert-success">{successMsg}</div>}
        {errorMsg && <div className="auth-alert alert-danger">{errorMsg}</div>}

        {testCode && (
          <div className="auth-alert alert-success" style={{ textAlign: 'center', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}>
            <strong>💡 Testing Helper:</strong> Your verification code is <code>{testCode}</code>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Verification Code</label>
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

          <button type="submit" className="btn btn-primary auth-submit" disabled={loadingLocal || !email}>
            {loadingLocal ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '24px' }}>
          {canResend ? (
            <button 
              onClick={handleResend} 
              className="btn btn-secondary" 
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Resend Verification Code
            </button>
          ) : (
            <p>Resend code in <strong>{countdown}s</strong></p>
          )}
          <p style={{ marginTop: '16px' }}>
            Incorrect email? <Link to="/register">Register again</Link> or <Link to="/login">Log in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
