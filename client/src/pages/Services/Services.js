import React, { useState, useEffect, useContext } from 'react';
import API from '../../services/api.js';
import { AuthContext } from '../../context/AuthContext.js';
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
  return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop';
};

export default function Services() {
  const { user } = useContext(AuthContext);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal Inquiry state
  const [activeService, setActiveService] = useState(null);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [requirements, setRequirements] = useState('');
  const [referenceFile, setReferenceFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Prefill details if user changes/logs in
  useEffect(() => {
    if (user) {
      setInquiryName(user.name || '');
      setInquiryEmail(user.email || '');
    } else {
      setInquiryName('');
      setInquiryEmail('');
    }
  }, [user]);

  // Load Services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const { data } = await API.get('/services');
        if (data.success) {
          setServices(data.data);
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

  const openInquiryModal = (service) => {
    setActiveService(service);
    setRequirements(`Hi, I am interested in your "${service.title}" service. Please share details on timelines and customizable layouts. \n\nAdditional requirements: `);
    setInquiryPhone('');
    setReferenceFile(null);
    setSuccessMsg('');
  };

  const closeInquiryModal = () => {
    setActiveService(null);
  };

  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    if (!inquiryName || !inquiryEmail || !requirements) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('name', inquiryName);
      formData.append('email', inquiryEmail);
      formData.append('phone', inquiryPhone);
      formData.append('requirementsDescription', requirements);
      
      if (referenceFile) {
        formData.append('reference', referenceFile);
      }

      const { data } = await API.post('/contact/custom-design', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (data.success) {
        setSuccessMsg('Your custom design request has been submitted successfully! Our design desk will contact you shortly.');
        setInquiryPhone('');
        setReferenceFile(null);
      }
    } catch (err) {
      console.error('Error submitting service inquiry:', err);
      alert(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

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
                 service.title.toLowerCase().includes('business') ? '💼' : '🎨'}
              </span>
            </div>

            <div className="service-details-pane">
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              
              <div className="service-footer-row">
                <span className="service-price-tag-value">{service.price || 'Contact for price'}</span>
                <button 
                  onClick={() => openInquiryModal(service)}
                  className="btn btn-primary btn-sm service-inquire-btn"
                >
                  Inquire Now
                </button>
              </div>
            </div>

          </div>
        );
      })}
      </div>

      {/* Inquiry Modal Overlay */}
      {activeService && (
        <div className="modal-backdrop-overlay">
          <div className="modal-dialog-content glass-card fade-in-up">
            <button className="modal-close-btn" onClick={closeInquiryModal}>&times;</button>
            
            <h2>Service Inquiry</h2>
            <p className="modal-subtitle">You are inquiring about: <strong>{activeService.title}</strong></p>

            {successMsg ? (
              <div className="modal-success-pane">
                <div className="success-checkmark-circle">
                  <span className="success-checkmark"></span>
                </div>
                <p className="success-alert-txt">{successMsg}</p>
                <button className="btn btn-secondary w-full" onClick={closeInquiryModal}>
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitInquiry} className="modal-inquiry-form">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={inquiryEmail}
                    onChange={(e) => setInquiryEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter phone number..."
                    value={inquiryPhone}
                    onChange={(e) => setInquiryPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Detailed Requirements *</label>
                  <textarea
                    required
                    rows="4"
                    className="form-input textarea-control"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Reference Design / PDF (Optional)</label>
                  <input
                    type="file"
                    className="form-input file-input-control"
                    onChange={(e) => setReferenceFile(e.target.files[0])}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="btn btn-primary w-full submit-inquiry-btn"
                >
                  {submitting ? 'Submitting request...' : 'Send Inquiry Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
