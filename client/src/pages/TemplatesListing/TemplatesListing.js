import React, { useState, useEffect, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API, { resolveUploadUrl } from '../../services/api.js';
import { AuthContext } from '../../context/AuthContext.js';
import './TemplatesListing.css';

export default function TemplatesListing() {
  const { t, language } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';

  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParam);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setSearch(searchParam);
  }, [searchParam]);

  useEffect(() => {
    setSelectedCategory(categoryParam);
    setSelectedTag('');
    setPage(1);
  }, [categoryParam]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await API.get('/categories');
        setCategories(data.data);
      } catch (err) {
        console.error('Error fetching categories list:', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const params = {
          page,
          limit: 6,
          search: searchParam,
          category: selectedCategory,
          type: selectedType,
          sort: sortBy,
          tag: selectedTag,
        };

        const { data } = await API.get('/templates', { params });
        if (data.success) {
          setTemplates(data.data);
          setTotalPages(data.pagination.pages);
          setTotalItems(data.pagination.total);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [page, selectedCategory, selectedType, sortBy, selectedTag, searchParam]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchParams({ category: selectedCategory, search });
  };

  const handleCategorySelect = (slug) => {
    setSelectedCategory(slug);
    setSelectedTag(''); // Reset sub-category tag filter
    setPage(1);
    setSearchParams({ category: slug, search });
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="listing-page max-width-container fade-in-up">
      <div className="listing-header">
        <h1>{t('exploreHeading')} <span>{t('exploreSpan')}</span></h1>
        <p>{t('exploreSub')}</p>
      </div>

      <div className="listing-filters-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            className="form-input search-input"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary search-btn">{t('searchBtn')}</button>
        </form>

        <div className="filters-controls">
          <div className="filter-control-item">
            <label className="form-label">{t('sortBy')}</label>
            <select className="form-input select-control" value={sortBy} onChange={handleSortChange}>
              <option value="newest">{language === 'en' ? 'Newest First' : 'కొత్తవి మొదట'}</option>
              <option value="price-low">{language === 'en' ? 'Price: Low to High' : 'ధర: తక్కువ నుండి ఎక్కువ'}</option>
              <option value="price-high">{language === 'en' ? 'Price: High to Low' : 'ధర: ఎక్కువ నుండి తక్కువ'}</option>
              <option value="popular">{language === 'en' ? 'Popular Templates' : 'ప్రజాదరణ పొందినవి'}</option>
              <option value="featured">{language === 'en' ? 'Featured Templates' : 'ప్రత్యేకమైనవి'}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="category-pills">
        <button
          className={`pill-btn ${selectedCategory === '' ? 'active' : ''}`}
          onClick={() => handleCategorySelect('')}
        >
          {t('allCat')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            className={`pill-btn ${selectedCategory === cat.slug || selectedCategory === cat._id ? 'active' : ''}`}
            onClick={() => handleCategorySelect(cat.slug)}
          >
            {language === 'en' ? cat.name : (
              cat.name === 'Political' ? 'రాజకీయాలు' :
              cat.name === 'Birthday' ? 'పుట్టినరోజు' :
              cat.name === 'Anniversary' ? 'వార్షికోత్సవం' :
              cat.name === 'Wedding' ? 'వివాహం' :
              cat.name === 'Festival' ? 'పండుగ' :
              cat.name === 'Business' ? 'వ్యాపారం' :
              cat.name === 'Photo Frames' ? 'ఫోటో ఫ్రేములు' : cat.name
            )}
          </button>
        ))}
      </div>

      {selectedCategory === 'festival' && (
        <div className="subcategory-pills fade-in-up">
          <button
            className={`subpill-btn ${selectedTag === '' ? 'active' : ''}`}
            onClick={() => { setSelectedTag(''); setPage(1); }}
          >
            {language === 'en' ? 'All Festivals' : 'అన్ని పండుగలు'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'hindu' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('hindu'); setPage(1); }}
          >
            🕉️ {language === 'en' ? 'Hindu' : 'హిందూ'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'muslim' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('muslim'); setPage(1); }}
          >
            🌙 {language === 'en' ? 'Muslim' : 'ముస్లిం'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'christian' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('christian'); setPage(1); }}
          >
            ✝️ {language === 'en' ? 'Christian' : 'క్రైస్తవ'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'national' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('national'); setPage(1); }}
          >
            🇮🇳 {language === 'en' ? 'National' : 'జాతీయ'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'seasonal' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('seasonal'); setPage(1); }}
          >
            🌦️ {language === 'en' ? 'Seasonal' : 'ఋతువులు'}
          </button>
        </div>
      )}

      {(selectedCategory === 'political' || selectedCategory === 'Political') && (
        <div className="subcategory-pills fade-in-up">
          <button
            className={`subpill-btn ${selectedTag === '' ? 'active' : ''}`}
            onClick={() => { setSelectedTag(''); setPage(1); }}
          >
            {language === 'en' ? 'All Parties' : 'అన్ని పార్టీలు'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'bjp' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('bjp'); setPage(1); }}
          >
            {language === 'en' ? 'BJP' : 'బీజేపీ'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'congress' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('congress'); setPage(1); }}
          >
            {language === 'en' ? 'Congress' : 'కాంగ్రెస్'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'brs' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('brs'); setPage(1); }}
          >
            {language === 'en' ? 'BRS' : 'బీఆర్ఎస్'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'tdp' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('tdp'); setPage(1); }}
          >
            {language === 'en' ? 'TDP' : 'టీడీపీ'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'ysrcp' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('ysrcp'); setPage(1); }}
          >
            {language === 'en' ? 'YSRCP' : 'వైఎస్ఆర్సీపీ'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'jana-sena' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('jana-sena'); setPage(1); }}
          >
            {language === 'en' ? 'Jana Sena' : 'జనసేన'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'aap' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('aap'); setPage(1); }}
          >
            {language === 'en' ? 'AAP' : 'ఆప్'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'cpm' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('cpm'); setPage(1); }}
          >
            {language === 'en' ? 'CPM' : 'సీపీఎం'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'cpi' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('cpi'); setPage(1); }}
          >
            {language === 'en' ? 'CPI' : 'సీపీఐ'}
          </button>
          <button
            className={`subpill-btn ${selectedTag === 'others' ? 'active' : ''}`}
            onClick={() => { setSelectedTag('others'); setPage(1); }}
          >
            {language === 'en' ? 'Others' : 'ఇతరులు'}
          </button>
        </div>
      )}

      <div className="type-toggle-bar">
        <button
          className={`type-btn ${selectedType === '' ? 'active' : ''}`}
          onClick={() => handleTypeSelect('')}
        >
          {t('allFormats')}
        </button>
        <button
          className={`type-btn ${selectedType === 'image' ? 'active' : ''}`}
          onClick={() => handleTypeSelect('image')}
        >
          {t('imgTemplates')}
        </button>
        <button
          className={`type-btn ${selectedType === 'video' ? 'active' : ''}`}
          onClick={() => handleTypeSelect('video')}
        >
          {t('vidTemplates')}
        </button>
      </div>

      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      ) : (
        <div className="listing-results">
          {templates.length > 0 ? (
            <div className="templates-grid">
              {templates.map((template) => (
                <div key={template._id} className="template-card glass-card">
                  <div className="template-image" style={{ backgroundImage: `url(${resolveUploadUrl(template.previewUrl)})` }}>
                    {template.isFeatured && <span className="template-badge badge-featured">Featured</span>}
                    {template.isPopular && <span className="template-badge badge-popular">Popular</span>}
                    <span className="template-type-badge">{template.type === 'image' ? (language === 'en' ? 'IMG' : 'చిత్రం') : (language === 'en' ? 'VIDEO' : 'వీడియో')}</span>
                  </div>
                  <div className="template-details">
                    <h3>{template.title}</h3>
                    <p className="template-cat">
                      {template.category?.name ? (
                        language === 'en' ? template.category.name : (
                          template.category.name === 'Political' ? 'రాజకీయాలు' :
                          template.category.name === 'Birthday' ? 'పుట్టినరోజు' :
                          template.category.name === 'Anniversary' ? 'వార్షికోత్సవం' :
                          template.category.name === 'Wedding' ? 'వివాహం' :
                          template.category.name === 'Festival' ? 'పండుగ' :
                          template.category.name === 'Business' ? 'వ్యాపారం' :
                          template.category.name === 'Photo Frames' ? 'ఫోటో ఫ్రేములు' : template.category.name
                        )
                      ) : (language === 'en' ? 'Category' : 'విభాగం')}
                    </p>
                    <p className="template-desc-short">{template.description}</p>
                    <div className="template-row">
                      <span className="template-price">₹{template.price}</span>
                      <Link to={`/templates/${template._id}`} className="btn btn-primary btn-sm">{t('btnCustomize')}</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state glass-card">
              <h3>{t('noTemplates')}</h3>
              <p>We couldn't find any templates matching your search criteria. Try modifying your filters or search keywords.</p>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('');
                  setSelectedType('');
                  setSearchParams({});
                }}
              >
                {t('resetFilters')}
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                className="btn btn-secondary pagination-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                &larr; {language === 'en' ? 'Prev' : 'వెనుకకు'}
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`page-num-btn ${page === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                className="btn btn-secondary pagination-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                {language === 'en' ? 'Next' : 'ముందుకు'} &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
