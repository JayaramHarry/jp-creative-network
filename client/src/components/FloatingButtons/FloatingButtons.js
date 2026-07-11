import React, { useState } from 'react';
import './FloatingButtons.css';

export default function FloatingButtons() {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <div className={`floating-container ${expanded ? 'expanded' : ''}`}>
      <div className="floating-menu">
        <a
          href="https://wa.me/919666310391"
          target="_blank"
          rel="noopener noreferrer"
          className="floating-action whatsapp"
          title="WhatsApp Support"
        >
          <span className="tooltip">WhatsApp</span>
          <span className="icon">💬</span>
          <span className="mobile-label">WhatsApp</span>
        </a>

        <a
          href="https://www.instagram.com/jp_editer___?igsh=MXNtcHUxZnJhc3c4dA=="
          target="_blank"
          rel="noopener noreferrer"
          className="floating-action instagram poster-ig"
          title="Poster Videos Instagram"
        >
          <span className="tooltip">Poster Videos</span>
          <span className="icon">📸</span>
          <span className="mobile-label">Poster IG</span>
        </a>

        <a
          href="https://www.instagram.com/jp_editing_service?igsh=MXdxZXAyODN5a295eg=="
          target="_blank"
          rel="noopener noreferrer"
          className="floating-action instagram ai-ig"
          title="AI Videos Instagram"
        >
          <span className="tooltip">AI Videos</span>
          <span className="icon">🤖</span>
          <span className="mobile-label">AI Videos IG</span>
        </a>

        <a
          href="https://www.instagram.com/jp_visual_network?igsh=dmtnbjdsNWZ2Mmw1"
          target="_blank"
          rel="noopener noreferrer"
          className="floating-action instagram reels-ig"
          title="Reels Instagram"
        >
          <span className="tooltip">Reels & Edits</span>
          <span className="icon">🎞️</span>
          <span className="mobile-label">Reels IG</span>
        </a>

        <a
          href="https://youtube.com/@all.types.editings?si=AKAQK8DC0eWOrGFz"
          target="_blank"
          rel="noopener noreferrer"
          className="floating-action youtube"
          title="YouTube Channel"
        >
          <span className="tooltip">YouTube</span>
          <span className="icon">🎥</span>
          <span className="mobile-label">YouTube</span>
        </a>
      </div>

      <button className="floating-trigger" onClick={handleToggle} title="Connect with Us">
        <span className="trigger-icon">{expanded ? '✕' : '💬'}</span>
      </button>
    </div>
  );
}
