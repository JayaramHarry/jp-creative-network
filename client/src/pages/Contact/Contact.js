import React, { useState, useContext, useEffect } from 'react';
import API from '../../services/api.js';
import { AuthContext } from '../../context/AuthContext.js';
import './Contact.css';

export default function Contact() {
  const { user } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Prefill user details if logged in
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await API.post('/contact', {
        name,
        email,
        phone,
        businessName,
        subject,
        message,
      });

      if (data.success) {
        setSuccess(true);
        setPhone('');
        setBusinessName('');
        setSubject('');
        setMessage('');
      }
    } catch (err) {
      console.error('Contact submission error:', err);
      alert(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page max-width-container fade-in-up">
      <div className="contact-header">
        <h1>Get in <span>Touch</span></h1>
        <p>Have questions about premium files or custom templates? Write to us.</p>
      </div>

      <div className="contact-grid">

        {/* Left: Info Card */}
        <div className="contact-info-card glass-card">
          <h2>Contact Info</h2>
          <p className="contact-description">
            Need urgent campaign cards, customized frames or design support? Reach out directly via our social channels.
          </p>

          <div className="info-detail-list">
            <div className="info-detail-item">
              <span className="info-icon">📧</span>
              <div className="info-text">
                <h3>Support Email</h3>
                <p>jayaprakashnetha1@gmail.com</p>
              </div>
            </div>

            <div className="info-detail-item">
              <span className="info-icon">📞</span>
              <div className="info-text">
                <h3>WhatsApp Support</h3>
                <p>+91 96663 10391</p>
              </div>
            </div>

            <div className="info-detail-item">
              <span className="info-icon">📍</span>
              <div className="info-text">
                <h3>Studio Desk</h3>
                <p>Telangana / Andhra Pradesh, India</p>
              </div>
            </div>
          </div>

          <hr className="contact-divider" />

          <h3>Connect on Socials</h3>
          <div className="social-links-row">
            <a href="https://wa.me/919666310391" target="_blank" rel="noopener noreferrer" className="social-btn wa-btn">
              WhatsApp Support
            </a>
            <a href="https://www.instagram.com/jp_editer___?igsh=MXNtcHUxZnJhc3c4dA==" target="_blank" rel="noopener noreferrer" className="social-btn ig-btn">
              Instagram Direct
            </a>
          </div>
        </div>

        {/* Right: Message Form */}
        <div className="contact-form-card glass-card">
          <h2>Send a Message</h2>

          {success ? (
            <div className="form-success-state">
              <div className="success-checkmark-circle">
                <span className="success-checkmark"></span>
              </div>
              <h3>Message Sent!</h3>
              <p>Thank you for writing. Our support desk will respond to your query within 24 hours.</p>
              <button onClick={() => setSuccess(false)} className="btn btn-secondary w-full mt-15">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name..."
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email..."
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="Enter your phone number..."
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Enter your business/company name..."
                  className="form-input"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purchase query, Custom campaign card..."
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message Details</label>
                <textarea
                  required
                  rows="5"
                  placeholder="Explain your query..."
                  className="form-input textarea-control"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full submit-contact-btn"
              >
                {submitting ? 'Sending query...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
