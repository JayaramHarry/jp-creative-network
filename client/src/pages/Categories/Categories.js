import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api.js';
import './Categories.css';

const POLITICAL_PARTIES = [
  {
    id: 'bjp',
    name: 'Bharatiya Janata Party (BJP)',
    symbolName: 'Lotus',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/BJP_Election_Symbol.svg',
    color: '#FF9F1C',
    slogan: 'Nation First, Always First',
    image: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'inc',
    name: 'Indian National Congress (INC)',
    symbolName: 'Hand',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Indian_National_Congress_hand_logo.svg',
    color: '#00A896',
    slogan: 'Unity in Diversity',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'aap',
    name: 'Aam Aadmi Party (AAP)',
    symbolName: 'Broom',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Aam_Aadmi_Party_logo.svg',
    color: '#028090',
    slogan: 'Honest Politics, Real Progress',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'bsp',
    name: 'Bahujan Samaj Party (BSP)',
    symbolName: 'Elephant',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Elephant_Bahujan_Samaj_Party.svg',
    color: '#05668D',
    slogan: 'Social Transformation & Justice',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'cpim',
    name: 'Communist Party (CPI-M)',
    symbolName: 'Hammer & Sickle',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/CPI%28M%29_election_symbol_-_Hammer_Sickle_and_Star.svg',
    color: '#D62246',
    slogan: 'For the Working Class',
    image: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'tmc',
    name: 'Trinamool Congress (TMC)',
    symbolName: 'Twin Flowers',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/50/All_India_Trinamool_Congress_logo.svg',
    color: '#4AD66D',
    slogan: 'Grassroots Development',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=400&auto=format&fit=crop'
  }
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await API.get('/categories');
        setCategories(data.data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="categories-page max-width-container fade-in-up">
      <div className="page-header">
        <h1>Design <span>Categories</span></h1>
        <p>Choose a category to browse templates, or edit based on political associations</p>
      </div>

      {loading ? (
        <div className="loader"></div>
      ) : (
        <div className="categories-list">
          <div className="categories-section-grid">
            {categories.map((cat) => (
              <Link to={`/templates?category=${cat.slug}`} key={cat._id} className="category-list-card glass-card">
                <div className="cat-img" style={{ backgroundImage: `url(${cat.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=400&auto=format&fit=crop'})` }}></div>
                <div className="cat-desc">
                  <h3>{cat.name}</h3>
                  <p>{cat.description}</p>
                  <span className="cat-browse-link">Explore Templates →</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="political-section">
            <div className="political-header">
              <h2>Indian <span>Political Parties</span> Cards</h2>
              <p>Directly customize templates with predefined party flags, colors, and symbols</p>
            </div>
            
            <div className="parties-grid">
              {POLITICAL_PARTIES.map((party) => (
                <div 
                  key={party.id} 
                  className="party-card glass-card"
                  style={{ '--party-accent': party.color }}
                >
                  <div className="party-card-glow"></div>
                  <h3 className="party-symbol-title">{party.symbolName}</h3>
                  <div className="party-symbol-circle">
                    <img src={party.logoUrl} className="party-logo-img" alt={party.symbolName} />
                  </div>
                  <div className="party-details">
                    <h3>{party.name}</h3>
                    <span className="party-slogan">"{party.slogan}"</span>
                    <Link 
                      to={`/templates?category=political&search=${party.id}`} 
                      className="btn btn-secondary party-btn"
                    >
                      Get Templates
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
