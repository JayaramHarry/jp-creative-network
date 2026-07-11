import React from 'react';
import './About.css';

export default function About() {
  const expertiseItems = [
    { title: "Photo Editing", icon: "📸", desc: "Professional image retouching, color correction, and premium layouts." },
    { title: "Video Editing", icon: "🎥", desc: "High-end cinematic cuts, transitions, effects, and audio sync." },
    { title: "AI Video Editing", icon: "🤖", desc: "Cutting-edge AI-assisted video production and visual content." },
    { title: "Social Media Management", icon: "📱", desc: "Strategic account growth, post planning, and community interaction." },
    { title: "Digital Marketing", icon: "🚀", desc: "Targeted advertising campaigns, SEO, and online brand visibility." },
    { title: "Political Marketing", icon: "🗳️", desc: "Impactful branding, banners, and video content for political leaders." },
    { title: "Business Promotion", icon: "💼", desc: "Custom ads, flyers, and creative visuals to showcase products." },
    { title: "Business Growth Solutions", icon: "📈", desc: "Analytical marketing strategies to scale business reach and revenue." }
  ];

  return (
    <div className="about-page max-width-container fade-in-up">
      <div className="about-header">
        <h1>About <span>JP Creative NetWork</span></h1>
        <p>Expert branding, digital marketing, and premium multimedia creation solutions</p>
      </div>

      <div className="about-main-grid">
        {/* Left: Founder Card */}
        <div className="founder-card glass-card">
          <div className="founder-image-wrapper">
            <img src="/founder_portrait.jpeg" alt="Papani Jayaprakash" className="founder-image" />
            <div className="experience-badge">
              <span className="exp-years">8+</span>
              <span className="exp-text">Years Exp.</span>
            </div>
          </div>
          <div className="founder-info">
            <h2>Papani Jayaprakash (Jp)</h2>
            <p className="founder-title">Founder & Creative Director</p>
            <p className="founder-bio">
              A visionary creator specializing in media editing, high-impact digital marketing, and political branding campaigns.
            </p>
          </div>
        </div>

        {/* Right: Company Info */}
        <div className="about-company-card glass-card">
          <h2>Our Journey</h2>
          <p>
            Established as a hub of innovation, <strong>JP Creative NetWork</strong> delivers premium graphic design, video editing, and digital marketing strategies. We help individuals, political leaders, and business enterprises establish an unforgettable visual presence.
          </p>
          <p>
            Whether it's creating custom festival templates, managing high-profile social media accounts, or executing targeted political marketing campaigns, we blend artistic precision with state-of-the-art tech.
          </p>
          <p>
            Our core mission is to make creative assets easily customizable and accessible, helping you connect with your audience in Telugu states and across India.
          </p>
        </div>
      </div>

      {/* Social Media Presence Section */}
      <div className="about-social-presence">
        <h2 className="section-title">Online Reach & <span>Credibility</span></h2>
        
        <div className="social-stats-grid">
          <div className="stat-card glass-card">
            <span className="stat-icon">📸</span>
            <div className="stat-details">
              <span className="stat-number">13.1K+</span>
              <span className="stat-label">Instagram Followers</span>
            </div>
          </div>
          
          <div className="stat-card glass-card">
            <span className="stat-icon">🎥</span>
            <div className="stat-details">
              <span className="stat-number">14.38K+</span>
              <span className="stat-label">YouTube Subscribers</span>
            </div>
          </div>
        </div>

        <div className="social-descriptions-grid">
          <div className="description-card glass-card">
            <h3>Dedicated Instagram Portfolios</h3>
            <p>
              To offer structured showcase styles and clean categorization, we maintain three separate dedicated Instagram accounts. This separate account strategy ensures you can directly access specialized visual styles and workflows:
            </p>
            <ul className="social-details-list">
              <li><strong>Video & Photo Editing:</strong> Professional retouching, custom branding graphics, and premium image templates.</li>
              <li><strong>AI Video Editing:</strong> Cutting-edge AI-assisted video productions, modern prompts, and automated high-end animations.</li>
              <li><strong>Political Party Social Media:</strong> Targeted public announcements, election layouts, and high-impact digital outreach campaigns.</li>
            </ul>
            <p className="specialized-note">
              This distinct organization helps clients immediately view relevant samples and select services that align with their exact campaign or business goals.
            </p>
          </div>

          <div className="description-card glass-card">
            <h3>YouTube Creative Showcase</h3>
            <p>
              Our YouTube channel serves as a comprehensive portfolio hub to build trust and demonstrate high-fidelity outputs. The channel features:
            </p>
            <ul className="social-details-list">
              <li><strong>Creative editing projects</strong> showcasing advanced transition effects and color grading.</li>
              <li><strong>Completed client work</strong> highlighting successful commercial campaigns and greeting setups.</li>
              <li><strong>AI editing content</strong> showcasing the latest in generative visual media creation.</li>
              <li><strong>Tutorials and editing tips</strong> sharing professional design workflows with the creative community.</li>
              <li><strong>Digital creative content</strong> tailored to digital branding and social engagement.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Expertise Grid Section */}
      <div className="expertise-section">
        <h2 className="section-title">Areas of <span>Expertise</span></h2>
        <div className="expertise-grid">
          {expertiseItems.map((item, idx) => (
            <div className="expertise-card glass-card" key={idx}>
              <span className="expertise-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="about-values-section glass-card">
        <h2>Why Choose JP Creative NetWork?</h2>
        <div className="values-grid">
          <div className="value-item">
            <span className="value-num">01</span>
            <div className="value-text">
              <h3>Live Studio Customization</h3>
              <p>Upload photos, crop, zoom, pan, and edit greetings on premium templates with instant canvas rendering.</p>
            </div>
          </div>

          <div className="value-item">
            <span className="value-num">02</span>
            <div className="value-text">
              <h3>Comprehensive Marketing</h3>
              <p>Get robust political banner frameworks, business advertisements, and social media campaigns under one roof.</p>
            </div>
          </div>

          <div className="value-item">
            <span className="value-num">03</span>
            <div className="value-text">
              <h3>Proven Industry Experience</h3>
              <p>Guided by 8+ years of expertise in digital media, we deliver layouts designed specifically to capture attention and convert views.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
