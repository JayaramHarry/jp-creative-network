import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api.js';
import './Home.css';

const HERO_SLIDES = [
  {
    title: 'Professional Media & Campaign Graphics',
    subtitle: 'Tailor-made templates for Indian political parties, public announcements, and personal greetings by JP Creative NetWork.',
    image: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?q=80&w=1200&auto=format&fit=crop',
    ctaLink: '/templates?category=political',
    ctaText: 'View Political Cards',
  },
  {
    title: 'Celebrate Life\'s Special Moments',
    subtitle: 'High-definition templates for Birthdays, Weddings, Anniversaries, and Festivals customized to your needs.',
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1200&auto=format&fit=crop',
    ctaLink: '/templates',
    ctaText: 'Browse Invitations',
  },
  {
    title: 'Premium Video & Photo Editing Solutions',
    subtitle: 'Expert photo editing, AI video creations, and digital marketing layouts designed for ultimate business growth.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
    ctaLink: '/templates?category=business',
    ctaText: 'Explore Business Layouts',
  }
];

const TESTIMONIALS = [
  {
    name: 'Rahul Sharma',
    role: 'Campaign Manager, BJP Maharashtra',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop',
    quote: 'JP Creative NetWork has completely elevated our digital outreach. Their templates are extremely premium and their custom edits are always on point!',
  },
  {
    name: 'Priya Netha',
    role: 'Creative Director, Event Horizon',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
    quote: 'The photo frames and festival greetings look incredibly professional. Our clients are always amazed at the visual quality of the final files.',
  },
  {
    name: 'Verma',
    role: 'Founder, AV Enterprises',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop',
    quote: 'Their social media marketing services helped us double our Instagram engagement. The team is dedicated and the designs are top-notch.',
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categories, setCategories] = useState([]);
  const [featuredTemplates, setFeaturedTemplates] = useState([]);
  const [popularTemplates, setPopularTemplates] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);

    return () => clearInterval(slideTimer);
  }, []);



  useEffect(() => {
    const fetchData = async () => {
      try {
        let catRes = await API.get('/categories');
        if (catRes.data.data.length === 0) {
          console.log('Database empty, triggering auto-seed...');
          await API.post('/seed');
          catRes = await API.get('/categories');
        }
        setCategories(catRes.data.data.slice(0, 4));

        const tempRes = await API.get('/templates?limit=12');
        const templates = tempRes.data.data;
        setFeaturedTemplates(templates.filter(t => t.isFeatured).slice(0, 3));
        setPopularTemplates(templates.filter(t => t.isPopular).slice(0, 3));

        const servRes = await API.get('/services');
        setServices(servRes.data.data.slice(0, 3));
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="home-page">
      <div className="animated-background">
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
      </div>

      <section className="hero-section">
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`hero-slide ${idx === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `linear-gradient(rgba(10, 12, 16, 0.6), rgba(10, 12, 16, 0.9)), url(${slide.image})` }}
          >
            <div className="hero-content fade-in-up">
              <h1>{slide.title}</h1>
              <p>{slide.subtitle}</p>
              <div className="hero-ctas">
                <Link to={slide.ctaLink} className="btn btn-primary">
                  {slide.ctaText}
                </Link>
                <Link to="/contact" className="btn btn-secondary">
                  Custom Request
                </Link>
              </div>
            </div>
          </div>
        ))}
        <div className="slide-indicators">
          {HERO_SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={`indicator ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
            ></span>
          ))}
        </div>
      </section>

      <section className="home-section max-width-container">
        <div className="section-header">
          <h2>Browse By <span>Category</span></h2>
          <p>Explore curated premium template categories for every occasion</p>
        </div>
        <div className="categories-grid">
          {categories.map((cat) => (
            <Link to={`/templates?category=${cat.slug}`} key={cat._id} className="category-card glass-card">
              <div className="category-image" style={{ backgroundImage: `url(${cat.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=400&auto=format&fit=crop'})` }}></div>
              <div className="category-info">
                <h3>{cat.name}</h3>
                <p>{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="section-footer">
          <Link to="/categories" className="btn btn-secondary">View All Categories</Link>
        </div>
      </section>

      <section className="home-section core-services-section max-width-container">
        <div className="section-header">
          <h2>Core <span>Solutions</span></h2>
          <p>Professional media creation, targeted advertising, and marketing services by industry experts</p>
        </div>
        <div className="core-services-grid">
          <div className="core-service-highlight glass-card">
            <span className="core-icon">🎬</span>
            <h3>Media Editing</h3>
            <p>High-end Photo Editing, Cinematic Video cuts, and modern AI Video Creations designed to elevate your visuals.</p>
          </div>
          <div className="core-service-highlight glass-card">
            <span className="core-icon">📣</span>
            <h3>Digital Marketing</h3>
            <p>Results-driven Social Media Marketing, SEO, Digital Marketing, and strategic Sales campaigns to scale businesses.</p>
          </div>
          <div className="core-service-highlight glass-card">
            <span className="core-icon">🗳️</span>
            <h3>Political Campaigns</h3>
            <p>Complete branding ecosystems, public marketing banners, and visual layouts for targeted elections and leaders.</p>
          </div>
        </div>
      </section>

      <section className="home-section dark-bg">
        <div className="max-width-container">
          <div className="section-header">
            <h2>Featured <span>Templates</span></h2>
            <p>Our top customizable hand-crafted designs</p>
          </div>
          {loading ? (
            <div className="loader"></div>
          ) : (
            <div className="templates-grid">
              {featuredTemplates.length > 0 ? (
                featuredTemplates.map((template) => (
                  <div key={template._id} className="template-card glass-card">
                    <div className="template-image" style={{ backgroundImage: `url(${template.previewUrl})` }}>
                      <span className="template-badge badge-featured">Featured</span>
                    </div>
                    <div className="template-details">
                      <h3>{template.title}</h3>
                      <p className="template-cat">{template.category?.name}</p>
                      <div className="template-row">
                        <span className="template-price">₹{template.price}</span>
                        <Link to={`/templates/${template._id}`} className="btn btn-primary btn-sm">Customize</Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No featured templates found.</div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="home-section max-width-container">
        <div className="section-header">
          <h2>Branding & Management <span>Services</span></h2>
          <p>Complete custom design and social media page maintenance packages</p>
        </div>
        <div className="services-grid">
          {services.map((serv) => (
            <div key={serv._id} className="service-card glass-card">
              <div className="service-icon">💼</div>
              <h3>{serv.title}</h3>
              <p>{serv.description}</p>
              <span className="service-price">{serv.price}</span>
              <Link to="/contact" className="service-link">Inquire Now →</Link>
            </div>
          ))}
        </div>
        <div className="section-footer">
          <Link to="/services" className="btn btn-secondary">Explore All Services</Link>
        </div>
      </section>

      <section className="home-section dark-bg">
        <div className="max-width-container">
          <div className="section-header">
            <h2>Popular <span>Downloads</span></h2>
            <p>Most purchased and downloaded templates this week</p>
          </div>
          <div className="templates-grid">
            {popularTemplates.length > 0 ? (
              popularTemplates.map((template) => (
                <div key={template._id} className="template-card glass-card">
                  <div className="template-image" style={{ backgroundImage: `url(${template.previewUrl})` }}>
                    <span className="template-badge badge-popular">Popular</span>
                  </div>
                  <div className="template-details">
                    <h3>{template.title}</h3>
                    <p className="template-cat">{template.category?.name}</p>
                    <div className="template-row">
                      <span className="template-price">₹{template.price}</span>
                      <Link to={`/templates/${template._id}`} className="btn btn-primary btn-sm">Customize</Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No popular templates found.</div>
            )}
          </div>
        </div>
      </section>


      <section className="home-section max-width-container">
        <div className="section-header">
          <h2>What Users <span>Say</span></h2>
          <p>Read experiences of our customers and campaign managers</p>
        </div>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((test, idx) => (
            <div key={idx} className="testimonial-card glass-card">
              <div className="testimonial-avatar" style={{ backgroundImage: `url(${test.image})` }}></div>
              <p className="testimonial-quote">"{test.quote}"</p>
              <h4 className="testimonial-name">{test.name}</h4>
              <span className="testimonial-role">{test.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section follow-work-section dark-bg">
        <div className="max-width-container">
          <div className="section-header">
            <h2>Follow Our <span>Work</span></h2>
            <p>See our latest video edits, templates, and designs live on social media</p>
          </div>
          <div className="follow-grid">
            <a href="https://www.instagram.com/jp_editer___?igsh=MXNtcHUxZnJhc3c4dA==" target="_blank" rel="noopener noreferrer" className="follow-card poster-ig">
              <span className="follow-icon">📸</span>
              <div className="follow-info">
                <h3>Poster Videos</h3>
                <span className="follow-handle">@jp_editer___</span>
              </div>
            </a>
            <a href="https://www.instagram.com/jp_editing_service?igsh=MXdxZXAyODN5a295eg==" target="_blank" rel="noopener noreferrer" className="follow-card ai-ig">
              <span className="follow-icon">🤖</span>
              <div className="follow-info">
                <h3>AI Videos</h3>
                <span className="follow-handle">@jp_editing_service</span>
              </div>
            </a>
            <a href="https://www.instagram.com/jp_visual_network?igsh=dmtnbjdsNWZ2Mmw1" target="_blank" rel="noopener noreferrer" className="follow-card reels-ig">
              <span className="follow-icon">🎞️</span>
              <div className="follow-info">
                <h3>Reels & Edits</h3>
                <span className="follow-handle">@jp_visual_network</span>
              </div>
            </a>
            <a href="https://youtube.com/@all.types.editings?si=AKAQK8DC0eWOrGFz" target="_blank" rel="noopener noreferrer" className="follow-card youtube-card">
              <span className="follow-icon">🎥</span>
              <div className="follow-info">
                <h3>YouTube Channel</h3>
                <span className="follow-handle">All Types Editings</span>
              </div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
