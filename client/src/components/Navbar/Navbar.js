import React, { useContext, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.js';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, getGreeting, language, toggleLanguage, t } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setIsOpen(false)}>
          JP Creative<span> NetW<svg className="navbar-logo-globe" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', display: 'inline-block', verticalAlign: 'middle', margin: '0 1px 4px 1px' }}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>rk</span>
        </Link>

        <div className="navbar-mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
          <span className={`bar ${isOpen ? 'open' : ''}`}></span>
          <span className={`bar ${isOpen ? 'open' : ''}`}></span>
          <span className={`bar ${isOpen ? 'open' : ''}`}></span>
        </div>

        <div className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          <NavLink to="/" className="navbar-link" onClick={() => setIsOpen(false)}>{t('navHome')}</NavLink>
          <NavLink to="/templates" className="navbar-link" onClick={() => setIsOpen(false)}>{t('navTemplates')}</NavLink>
          <NavLink to="/categories" className="navbar-link" onClick={() => setIsOpen(false)}>{t('navCategories')}</NavLink>
          <NavLink to="/services" className="navbar-link" onClick={() => setIsOpen(false)}>{t('navServices')}</NavLink>
          <NavLink to="/about" className="navbar-link" onClick={() => setIsOpen(false)}>{t('navAbout')}</NavLink>
          <NavLink to="/training" className="navbar-link" onClick={() => setIsOpen(false)}>{t('navTraining')}</NavLink>
          <NavLink to="/contact" className="navbar-link" onClick={() => setIsOpen(false)}>{t('navContact')}</NavLink>

          <button onClick={() => { toggleLanguage(); setIsOpen(false); }} className="lang-toggle-btn">
            🌐 {language === 'en' ? 'తెలుగు' : 'English'}
          </button>

          <div className="navbar-auth-section">
            {user ? (
              <div className="navbar-user-dropdown">
                <Link to="/dashboard" className="btn btn-secondary navbar-btn" onClick={() => setIsOpen(false)}>
                  {t('navDashboard')}
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="btn btn-secondary admin-btn" onClick={() => setIsOpen(false)}>
                    {t('navAdmin')}
                  </Link>
                )}
                <button onClick={handleLogout} className="btn btn-danger navbar-btn">
                  {t('navLogout')}
                </button>
              </div>
            ) : (
              <div className="navbar-auth-buttons">
                <Link to="/login" className="navbar-login-link" onClick={() => setIsOpen(false)}>{t('navLogin')}</Link>
                <Link to="/register" className="btn btn-primary navbar-register-btn" onClick={() => setIsOpen(false)}>
                  {language === 'en' ? 'Register' : 'రిజిస్టర్'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
