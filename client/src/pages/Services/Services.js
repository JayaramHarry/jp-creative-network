import React, { useState, useEffect, useContext } from 'react';
import API from '../../services/api.js';
import { AuthContext } from '../../context/AuthContext.js';
import { getWhatsAppLink } from '../../services/whatsappHelper.js';
import './Services.css';

const getServiceBackgroundImage = (title) => {
  const t = title.toLowerCase();
  if (t.includes('political social') || t.includes('political marketing')) {
    return 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('fan page')) {
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('instagram page') || t.includes('instagram')) {
    return 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('social media')) {
    return 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('photo frame') || t.includes('photo editing') || t.includes('photo')) {
    return 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('business development') || t.includes('sales')) {
    return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('ai video')) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('video editing') || t.includes('video')) {
    return 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('digital marketing') || t.includes('marketing')) {
    return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop';
  }
  if (t.includes('song') || t.includes('custom song')) {
    return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop';
  }
  return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop';
};

export default function Services() {
  const { user } = useContext(AuthContext);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const { data } = await API.get('/services');
        if (data.success) {
          const loaded = [...data.data];
          if (!loaded.some(s => s.title.toLowerCase().includes('custom song'))) {
            const customSong = {
              _id: 'custom-song-service-static',
              title: 'Custom Song',
              price: 'Starting at ₹999',
              description: 'Get professionally customized songs for birthdays, anniversaries, weddings, political campaigns, business promotions, love stories, invitations, baby showers, farewell events, and all special occasions.',
              features: [
                'Personalized lyrics',
                'Male/Female vocals',
                'Multiple language support',
                'Studio-quality music',
                'Fast delivery'
              ],
              isCustomSong: true
            };
            const videoIndex = loaded.findIndex(s => s.title.toLowerCase().includes('video editing'));
            if (videoIndex !== -1) {
              loaded.splice(videoIndex + 1, 0, customSong);
            } else {
              loaded.push(customSong);
            }
          }
          setServices(loaded);
        }
      } catch (err) {
        console.error('Error fetching services:', err);
        setError('Failed to fetch services list.');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="services-page max-width-container fade-in-up">
      <div className="services-header">
        <h1>Creative & Marketing <span>Services</span></h1>
        <p>Premium visual designs, cinematic editing, and results-oriented digital marketing solutions for JP Creative NetWork</p>
      </div>

      {error && <div className="alert-message error-alert">{error}</div>}

      <div className="services-grid">
        {services.map((service) => {
          const bgUrl = getServiceBackgroundImage(service.title);
          return (
            <div 
              key={service._id} 
              className="service-item-card glass-card"
              style={{
                backgroundImage: `linear-gradient(rgba(10, 12, 16, 0.82), rgba(10, 12, 16, 0.94)), url(${bgUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
              }}
            >
            
            {/* Display a mock premium icon/badge based on title */}
            <div className="service-card-icon-area">
              <span className="service-premium-glow"></span>
              <span className="service-badge-icon">
                {service.title.toLowerCase().includes('ai video') ? '🤖' :
                 service.title.toLowerCase().includes('video') ? '🎥' :
                 service.title.toLowerCase().includes('photo') ? '📸' :
                 service.title.toLowerCase().includes('political') ? '🗳️' :
                 service.title.toLowerCase().includes('digital') ? '🚀' :
                 service.title.toLowerCase().includes('sales') ? '📈' :
                 service.title.toLowerCase().includes('social') ? '📱' :
                 service.title.toLowerCase().includes('fan') ? '👑' :
                 service.title.toLowerCase().includes('song') || service.title.toLowerCase().includes('custom song') ? '🎵' :
                 service.title.toLowerCase().includes('business') ? '💼' : '🎨'}
              </span>
            </div>

            <div className="service-details-pane">
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              
              {service.features && (
                <ul className="service-features-list" style={{ listStyle: 'none', padding: 0, margin: '5px 0 0 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {service.features.map((feat, idx) => (
                    <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--secondary)' }}>•</span> {feat}
                    </li>
                  ))}
                </ul>
              )}
              
              <div className="service-footer-row">
                <span className="service-price-tag-value">{service.price || 'Contact for price'}</span>
                <a 
                  href={getWhatsAppLink(service.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm service-inquire-btn"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  {service.isCustomSong ? 'Order Now' : 'Inquire Now'}
                </a>
              </div>
            </div>

          </div>
        );
      })}
      </div>
    </div>
  );
}
