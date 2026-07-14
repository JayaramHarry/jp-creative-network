import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWhatsAppLink } from '../../services/whatsappHelper.js';
import './Training.css';

export default function Training() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="training-page max-width-container fade-in-up">
      <div className="training-header">
        <h1>Training <span>Academy</span></h1>
        <p className="training-subtitle">Learn Professional Editing Skills & Build Your Career</p>
      </div>

      <p className="training-main-desc">
        Turn your creativity into a profession by learning from an experienced editor. Whether you're a beginner or looking to upgrade your skills, our practical training programs help you master industry-standard editing tools and techniques. Outstanding learners may also get opportunities to work on real client projects remotely.
      </p>

      <div className="academy-grid">
        <div className="academy-courses-col">
          <div className="course-card glass-card">
            <div className="course-card-header">
              <span className="course-icon">🤖</span>
              <h3>AI Video Editing</h3>
            </div>
            <p className="course-desc">Learn to create AI-generated videos using the latest AI tools.</p>
            <ul className="course-details-list">
              <li>Prompt writing & AI generation</li>
              <li>AI animation workflows</li>
              <li>Voice generation & lip-sync</li>
              <li>Cinematic AI scene creation</li>
            </ul>
          </div>

          <div className="course-card glass-card">
            <div className="course-card-header">
              <span className="course-icon">🎥</span>
              <h3>Video Editing Masterclass</h3>
            </div>
            <p className="course-desc">Master the industry's most popular visual tools and edit reels, YouTube videos, wedding assets, promotional clips, and branding content.</p>
            <div className="tools-tags">
              <span className="tool-tag">Canva</span>
              <span className="tool-tag">CapCut</span>
              <span className="tool-tag">Adobe Premiere Pro</span>
              <span className="tool-tag">Adobe After Effects</span>
              <span className="tool-tag">Other Popular Tools</span>
            </div>
          </div>

          <div className="course-card glass-card">
            <div className="course-card-header">
              <span className="course-icon">🎨</span>
              <h3>Photo Editing & Creative Design</h3>
            </div>
            <p className="course-desc">Learn to design high-quality graphics and images for print and digital media.</p>
            <ul className="course-details-list">
              <li>Professional photo retouching</li>
              <li>Poster and campaign banner design</li>
              <li>Social media greetings and creatives</li>
              <li>Custom digital invitation cards</li>
              <li>Eye-catching YouTube thumbnail design</li>
            </ul>
          </div>
        </div>

        <div className="academy-wfh-col">
          <div className="wfh-highlight-card glass-card">
            <div className="wfh-header">
              <span className="wfh-badge">Featured Opportunity</span>
              <span className="wfh-icon">🏠</span>
              <h3>Work From Home Opportunities</h3>
            </div>
            <p className="wfh-desc">
              Talented students who successfully complete the training and demonstrate strong editing skills may receive opportunities to work remotely on real client projects. This allows them to gain practical experience, build a professional portfolio, and earn income by editing videos from home.
            </p>
            <div className="wfh-note">
              <strong>Please Note:</strong> This is a potential opportunity based on skills and project availability, not a guaranteed job placement. We prioritize students who show dedication and deliver outstanding work.
            </div>
            <div className="wfh-cta-row">
              <a 
                href={getWhatsAppLink('Video Editing Academy Training')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary wfh-btn"
              >
                Inquire About Training
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="academy-benefits-section">
        <h3 className="benefits-title">Key <span>Benefits</span></h3>
        <div className="benefits-grid">
          <div className="benefit-badge">
            <span className="benefit-icon">💡</span> Live Practical Training
          </div>
          <div className="benefit-badge">
            <span className="benefit-icon">👶</span> Beginner Friendly
          </div>
          <div className="benefit-badge">
            <span className="benefit-icon">🏆</span> Industry-Level Projects
          </div>
          <div className="benefit-badge">
            <span className="benefit-icon">⚡</span> AI Editing Techniques
          </div>
          <div className="benefit-badge">
            <span className="benefit-icon">🛠️</span> Latest Editing Tools
          </div>
          <div className="benefit-badge">
            <span className="benefit-icon">💼</span> Portfolio Building
          </div>
          <div className="benefit-badge">
            <span className="benefit-icon">🌍</span> Remote Work Opportunities
          </div>
          <div className="benefit-badge">
            <span className="benefit-icon">🧭</span> Career Guidance
          </div>
        </div>
      </div>
    </div>
  );
}
