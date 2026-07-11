import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.js';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setLoadingLocal(true);
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else if (res.isEmailVerified === false) {
        const queryParams = new URLSearchParams();
        queryParams.set('email', res.email);
        if (res.testCode) {
          queryParams.set('code', res.testCode);
        }
        navigate(`/verify-email?${queryParams.toString()}`);
      } else {
        setErrorMsg(res.message || 'Invalid credentials.');
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
        <h2 className="auth-title">Welcome Back to <span>Memoria Studio</span></h2>
        <p className="auth-subtitle">Log in to customize and access your templates</p>

        {errorMsg && <div className="auth-alert alert-danger">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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

          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--primary-hover)' }}>
                Forgot Password?
              </Link>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="show-password-container">
              <input
                type="checkbox"
                id="show-password-login"
                className="show-password-checkbox"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label htmlFor="show-password-login" className="show-password-label">
                Show Password
              </label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loadingLocal}>
            {loadingLocal ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one now</Link>
        </p>
      </div>
    </div>
  );
}
