import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand-section">
            <Link to="/" className="footer-logo">
              JP Creative<span> NetWork</span>
            </Link>
            <p className="footer-desc">
              Your premium destination for professional photo editing, high-quality video editing, AI video creations, and result-oriented digital marketing campaigns.
            </p>
            <div className="footer-socials">
              <a href="https://www.instagram.com/jp_editer___?igsh=MXNtcHUxZnJhc3c4dA==" target="_blank" rel="noopener noreferrer" className="social-icon" title="Poster Videos Instagram">📸</a>
              <a href="https://www.instagram.com/jp_editing_service?igsh=MXdxZXAyODN5a295eg==" target="_blank" rel="noopener noreferrer" className="social-icon" title="AI Videos Instagram">🤖</a>
              <a href="https://www.instagram.com/jp_visual_network?igsh=dmtnbjdsNWZ2Mmw1" target="_blank" rel="noopener noreferrer" className="social-icon" title="Reels Instagram">🎞️</a>
              <a href="https://youtube.com/@all.types.editings?si=AKAQK8DC0eWOrGFz" target="_blank" rel="noopener noreferrer" className="social-icon" title="YouTube Channel">🎥</a>
              <a href="https://wa.me/919666310391" target="_blank" rel="noopener noreferrer" className="social-icon" title="WhatsApp Support">💬</a>
            </div>
          </div>

          <div className="footer-links-section">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/templates">Browse Templates</Link></li>
              <li><Link to="/services">Branding Services</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Get in Touch</Link></li>
            </ul>
          </div>

          <div className="footer-links-section">
            <h4 className="footer-title">Categories</h4>
            <ul className="footer-links">
              <li><Link to="/templates?category=political">Political Branding</Link></li>
              <li><Link to="/templates?category=birthday">Birthday Wishes</Link></li>
              <li><Link to="/templates?category=anniversary">Anniversaries</Link></li>
              <li><Link to="/templates?category=festival">Festivals & Wishes</Link></li>
              <li><Link to="/templates?category=business">Business Promotion</Link></li>
            </ul>
          </div>

          <div className="footer-contact-section">
            <h4 className="footer-title">Contact Info</h4>
            <p className="footer-text">Telangana / Andhra Pradesh, India</p>
            <p className="footer-text">Email: jayaprakashnetha1@gmail.com</p>
            <p className="footer-text">WhatsApp: +91 96663 10391</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} JP Creative NetWork. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
