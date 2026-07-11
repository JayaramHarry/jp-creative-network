import React, { useState, useEffect } from 'react';
import API from '../../services/api.js';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'templates', 'categories', 'orders', 'users', 'inquiries'

  // Metric states
  const [stats, setStats] = useState({ totalUsers: 0, totalTemplates: 0, totalOrders: 0, totalRevenue: 0 });
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [customDesigns, setCustomDesigns] = useState([]);

  // Seeding/Loading states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirmation state (inline instead of window.confirm)
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('success');

  const showStatus = (msg, type = 'success') => {
    setStatusMessage(msg);
    setStatusType(type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  // Forms states
  // Categories form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catFile, setCatFile] = useState(null);

  // Templates form
  const [tplId, setTplId] = useState(null); // for editing
  const [tplTitle, setTplTitle] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplPrice, setTplPrice] = useState(0);
  const [tplType, setTplType] = useState('image');
  const [tplCategory, setTplCategory] = useState('');
  const [tplIsFeatured, setTplIsFeatured] = useState(false);
  const [tplIsPopular, setTplIsPopular] = useState(false);
  const [tplPreviewFile, setTplPreviewFile] = useState(null);
  const [tplSourceFile, setTplSourceFile] = useState(null);
  const [tplPoliticalParty, setTplPoliticalParty] = useState('');
  const [tplConfigStr, setTplConfigStr] = useState(JSON.stringify({
    photoBox: { x: 50, y: 300, width: 180, height: 220 },
    texts: [
      { id: 'name', label: 'Leader Name', x: 250, y: 360, fontSize: 30, color: '#FF9F1C', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'left', defaultValue: 'Name Here' },
      { id: 'designation', label: 'Designation', x: 250, y: 400, fontSize: 18, color: '#FFFFFF', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'left', defaultValue: 'Designation' }
    ]
  }, null, 2));

  // Load Admin Data
  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const { data } = await API.get('/admin/stats');
        if (data.success) setStats(data.data);
      } else if (activeTab === 'templates') {
        const { data: catData } = await API.get('/categories');
        if (catData.success) {
          setCategories(catData.data);
          if (catData.data.length > 0) setTplCategory(catData.data[0]._id);
        }
        const { data: tplData } = await API.get('/templates?limit=100');
        if (tplData.success) setTemplates(tplData.data);
      } else if (activeTab === 'categories') {
        const { data } = await API.get('/categories');
        if (data.success) setCategories(data.data);
      } else if (activeTab === 'orders') {
        const { data } = await API.get('/orders');
        if (data.success) setOrders(data.data);
      } else if (activeTab === 'users') {
        const { data } = await API.get('/admin/users');
        if (data.success) setUsers(data.data);
      } else if (activeTab === 'inquiries') {
        const { data: contactsData } = await API.get('/contact/requests');
        if (contactsData.success) setContacts(contactsData.data);
        const { data: designsData } = await API.get('/contact/custom-designs');
        if (designsData.success) setCustomDesigns(designsData.data);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger seed database
  const handleSeedDB = async () => {
    try {
      setLoading(true);
      const { data } = await API.post('/seed');
      showStatus(data.message || 'Database seeded successfully.');
      fetchAdminData();
    } catch (err) {
      showStatus('Seeding error: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const { data } = await API.delete(`/admin/users/${userId}`);
      if (data.success) {
        showStatus('User account deleted.');
        fetchAdminData();
      }
    } catch (err) {
      showStatus(err.response?.data?.message || 'Delete operation failed.', 'error');
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const { data } = await API.put(`/orders/${orderId}`, { status: newStatus });
      if (data.success) {
        showStatus('Order status updated.');
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Status update failed.', 'error');
    }
  };

  // Update inquiry contact status
  const handleUpdateContactStatus = async (contactId, newStatus) => {
    try {
      const { data } = await API.put(`/contact/requests/${contactId}`, { status: newStatus });
      if (data.success) {
        showStatus('Inquiry state updated.');
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Update failed.', 'error');
    }
  };

  // Update Custom Design request status
  const handleUpdateCustomDesignStatus = async (requestId, newStatus) => {
    try {
      const { data } = await API.put(`/contact/custom-designs/${requestId}`, { status: newStatus });
      if (data.success) {
        showStatus('Custom design status updated.');
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Update failed.', 'error');
    }
  };

  // Submit Category Form
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!catName || !catDesc) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', catName);
      formData.append('description', catDesc);
      if (catFile) formData.append('image', catFile);

      const { data } = await API.post('/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        showStatus('Category added successfully.');
        setCatName('');
        setCatDesc('');
        setCatFile(null);
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Failed to add category.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Delete category? All templates linked to this category may lose references.')) return;
    try {
      const { data } = await API.delete(`/categories/${catId}`);
      if (data.success) {
        showStatus('Category deleted.');
        fetchAdminData();
      }
    } catch (err) {
      showStatus(err.response?.data?.message || 'Failed to delete category.', 'error');
    }
  };

  // Submit Template Form (Create or Edit)
  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!tplTitle || !tplDesc || !tplCategory) {
      showStatus('Please fill out Title, Description, and Category.', 'error');
      return;
    }

    const selectedCatObj = categories.find((c) => c._id === tplCategory);
    const isPoliticalCategory = selectedCatObj && (selectedCatObj.slug === 'political' || selectedCatObj.name === 'Political');

    if (isPoliticalCategory && !tplPoliticalParty) {
      showStatus('Please select a political party.', 'error');
      return;
    }

    // Validation for new templates (Create Mode)
    if (!tplId) {
      if (tplType === 'image' && !tplPreviewFile) {
        showStatus('Please upload a preview image.', 'error');
        return;
      }
      if (tplType === 'video' && !tplSourceFile) {
        showStatus('Please upload a video file for video templates.', 'error');
        return;
      }
    }

    let parsedConfig = {};
    try {
      parsedConfig = JSON.parse(tplConfigStr);
    } catch (err) {
      showStatus('Configuration contains invalid JSON schema. Verify formats.', 'error');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', tplTitle);
      formData.append('description', tplDesc);
      formData.append('price', tplPrice);
      formData.append('type', tplType);
      formData.append('category', tplCategory);
      formData.append('isFeatured', tplIsFeatured);
      formData.append('isPopular', tplIsPopular);
      formData.append('config', JSON.stringify(parsedConfig));

      const tagsToSend = isPoliticalCategory 
        ? [tplPoliticalParty, 'political'] 
        : ['general'];
      formData.append('tags', JSON.stringify(tagsToSend));

      if (tplPreviewFile) formData.append('preview', tplPreviewFile);
      if (tplSourceFile) formData.append('file', tplSourceFile);

      if (tplId) {
        // Edit Mode
        const { data } = await API.put(`/templates/${tplId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (data.success) {
          showStatus('Template updated successfully.');
          resetTemplateForm();
          fetchAdminData();
        }
      } else {
        // Create Mode
        const { data } = await API.post('/templates', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (data.success) {
          showStatus('Template added successfully.');
          resetTemplateForm();
          fetchAdminData();
        }
      }
    } catch (err) {
      console.error(err);
      showStatus(err.response?.data?.message || 'Failed to save template.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditTemplate = (tpl) => {
    setTplId(tpl._id);
    setTplTitle(tpl.title);
    setTplDesc(tpl.description);
    setTplPrice(tpl.price);
    setTplType(tpl.type);
    const catId = tpl.category?._id || tpl.category || '';
    setTplCategory(catId);
    setTplIsFeatured(tpl.isFeatured || false);
    setTplIsPopular(tpl.isPopular || false);
    setTplConfigStr(JSON.stringify(tpl.config || {}, null, 2));

    const parties = ['bjp', 'congress', 'brs', 'tdp', 'ysrcp', 'jana-sena', 'aap', 'cpm', 'cpi', 'others'];
    const foundParty = tpl.tags?.find(tag => parties.includes(tag.toLowerCase()));
    setTplPoliticalParty(foundParty || '');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetTemplateForm = () => {
    setTplId(null);
    setTplTitle('');
    setTplDesc('');
    setTplPrice(0);
    setTplType('image');
    setTplIsFeatured(false);
    setTplIsPopular(false);
    setTplPreviewFile(null);
    setTplSourceFile(null);
    setTplPoliticalParty('');
  };

  // Delete Template — two-step inline confirmation (no window.confirm)
  const handleDeleteTemplate = async (templateId) => {
    try {
      const { data } = await API.delete(`/templates/${templateId}`);
      if (data.success) {
        setPendingDeleteId(null);
        showStatus('Template removed successfully.');
        fetchAdminData();
      } else {
        showStatus('Delete failed — server returned success: false', 'error');
      }
    } catch (err) {
      console.error('Delete template error:', err);
      showStatus(err.response?.data?.message || 'Delete operation failed: ' + err.message, 'error');
    }
  };

  const selectedCatObj = categories.find((c) => c._id === tplCategory);
  const isPoliticalCategory = selectedCatObj && (selectedCatObj.slug === 'political' || selectedCatObj.name === 'Political');

  return (
    <div className="admin-page max-width-container fade-in-up">
      <div className="admin-header-row">
        <h1>Admin <span>Dashboard</span></h1>
        <button onClick={handleSeedDB} className="btn btn-secondary seed-db-btn">
          🌱 Seed DB Defaults
        </button>
      </div>

      {statusMessage && (
        <div className={`status-banner-alert ${statusType} fade-in-up`}>
          {statusType === 'success' ? '✅' : '❌'} {statusMessage}
        </div>
      )}

      {/* Navigation tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>📊 Overview</button>
        <button className={`admin-tab-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>🖼️ Templates</button>
        <button className={`admin-tab-btn ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>📂 Categories</button>
        <button className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>🛒 Orders</button>
        <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 Users</button>
        <button className={`admin-tab-btn ${activeTab === 'inquiries' ? 'active' : ''}`} onClick={() => setActiveTab('inquiries')}>✉️ Inquiries</button>
      </div>

      {loading ? (
        <div className="loader-container"><div className="loader"></div></div>
      ) : (
        <div className="admin-tab-content">

          {/* Tab 1: Stats */}
          {activeTab === 'stats' && (
            <div className="admin-stats-panel fade-in-up">
              <div className="stats-grid">
                <div className="stat-card glass-card">
                  <h3>Total Revenue</h3>
                  <p className="stat-number">₹{stats.totalRevenue}</p>
                </div>
                <div className="stat-card glass-card">
                  <h3>Total Templates</h3>
                  <p className="stat-number">{stats.totalTemplates}</p>
                </div>
                <div className="stat-card glass-card">
                  <h3>Total Orders</h3>
                  <p className="stat-number">{stats.totalOrders}</p>
                </div>
                <div className="stat-card glass-card">
                  <h3>Registered Users</h3>
                  <p className="stat-number">{stats.totalUsers}</p>
                </div>
              </div>

              <div className="admin-quick-links glass-card mt-30">
                <h2>Database Tools</h2>
                <p>Use the seed button in the top right to quickly populated standard values (Indian Campaign templates, Category Pills, and Service cards) if testing locally on a blank database.</p>
              </div>
            </div>
          )}

          {/* Tab 2: Templates CRUD */}
          {activeTab === 'templates' && (
            <div className="admin-templates-panel fade-in-up">
              <div className="admin-split-grid">

                {/* Editor/Add Form */}
                <form onSubmit={handleTemplateSubmit} className="admin-form glass-card">
                  <h2>{tplId ? 'Edit Template' : 'Add New Template'}</h2>

                  <div className="form-group">
                    <label className="form-label">Template Title</label>
                    <input type="text" className="form-input" required value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Template Description</label>
                    <textarea className="form-input" required rows="3" value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} />
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label className="form-label">Price (INR)</label>
                      <input type="number" className="form-input" required value={tplPrice} onChange={(e) => setTplPrice(Number(e.target.value))} />
                    </div>
                    <div className="form-group flex-1">
                      <label className="form-label">Format Type</label>
                      <select className="form-input select-control" value={tplType} onChange={(e) => setTplType(e.target.value)}>
                        <option value="image">Image Format</option>
                        <option value="video">Video Format</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-input select-control" required value={tplCategory} onChange={(e) => setTplCategory(e.target.value)}>
                      {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>

                  {isPoliticalCategory && (
                    <div className="form-group animate-fade-in">
                      <label className="form-label">Political Party</label>
                      <select 
                        className="form-input select-control" 
                        required 
                        value={tplPoliticalParty} 
                        onChange={(e) => setTplPoliticalParty(e.target.value)}
                      >
                        <option value="">-- Select Party --</option>
                        <option value="bjp">BJP</option>
                        <option value="congress">Congress</option>
                        <option value="brs">BRS</option>
                        <option value="tdp">TDP</option>
                        <option value="ysrcp">YSRCP</option>
                        <option value="jana-sena">Jana Sena</option>
                        <option value="aap">AAP</option>
                        <option value="cpm">CPM</option>
                        <option value="cpi">CPI</option>
                        <option value="others">Others</option>
                      </select>
                    </div>
                  )}

                  <div className="form-row flex-align-center mb-15">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={tplIsFeatured} onChange={(e) => setTplIsFeatured(e.target.checked)} />
                      Featured Template
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={tplIsPopular} onChange={(e) => setTplIsPopular(e.target.checked)} />
                      Popular Template
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Preview Image {tplType === 'video' ? '(Optional)' : (tplId ? '(Optional Update)' : '(Required)')}
                    </label>
                    <input type="file" className="form-input" accept="image/*" onChange={(e) => setTplPreviewFile(e.target.files[0])} />
                  </div>

                  {tplType === 'video' && (
                    <div className="form-group animate-fade-in">
                      <label className="form-label">Video Source File (.mp4, .webm, .mov) {tplId && '(Optional Update)'}</label>
                      <input 
                        type="file" 
                        className="form-input" 
                        accept="video/mp4, video/webm, video/quicktime, video/*" 
                        onChange={(e) => setTplSourceFile(e.target.files[0])} 
                      />
                    </div>
                  )}


                  <div className="form-actions-row">
                    <button type="submit" disabled={saving} className="btn btn-primary flex-grow">
                      {saving ? 'Saving...' : 'Save Template'}
                    </button>
                    {tplId && (
                      <button type="button" onClick={resetTemplateForm} className="btn btn-secondary">
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {/* Templates Listing Table */}
                <div className="admin-table-wrapper glass-card">
                  <h2>Existing Templates ({templates.length})</h2>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Featured</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((tpl) => (
                        <tr key={tpl._id}>
                          <td><strong>{tpl.title}</strong><span className="table-subtext">{tpl.type.toUpperCase()}</span></td>
                          <td>{tpl.category?.name || 'Category'}</td>
                          <td>₹{tpl.price}</td>
                          <td>{tpl.isFeatured ? '★ Yes' : 'No'}</td>
                          <td>
                            <div className="table-actions-row">
                              <button onClick={() => handleEditTemplate(tpl)} className="btn btn-secondary btn-xs">Edit</button>
                              {pendingDeleteId === tpl._id ? (
                                <>
                                  <button onClick={() => handleDeleteTemplate(tpl._id)} className="btn btn-danger btn-xs">Confirm?</button>
                                  <button onClick={() => setPendingDeleteId(null)} className="btn btn-secondary btn-xs">Cancel</button>
                                </>
                              ) : (
                                <button onClick={() => setPendingDeleteId(tpl._id)} className="btn btn-danger btn-xs">Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* Tab 3: Categories CRUD */}
          {activeTab === 'categories' && (
            <div className="admin-categories-panel fade-in-up">
              <div className="admin-split-grid">

                {/* Form Category */}
                <form onSubmit={handleCategorySubmit} className="admin-form glass-card">
                  <h2>Add Category</h2>
                  <div className="form-group">
                    <label className="form-label">Category Name</label>
                    <input type="text" required className="form-input" value={catName} onChange={(e) => setCatName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea required className="form-input" rows="3" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category Image Icon (Optional)</label>
                    <input type="file" className="form-input" accept="image/*" onChange={(e) => setCatFile(e.target.files[0])} />
                  </div>
                  <button type="submit" disabled={saving} className="btn btn-primary w-full">
                    {saving ? 'Creating...' : 'Create Category'}
                  </button>
                </form>

                {/* Categories Table */}
                <div className="admin-table-wrapper glass-card">
                  <h2>Categories List ({categories.length})</h2>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c._id}>
                          <td><strong>{c.name}</strong></td>
                          <td className="table-desc-cell">{c.description}</td>
                          <td>
                            <button onClick={() => handleDeleteCategory(c._id)} className="btn btn-danger btn-xs">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* Tab 4: Orders Management */}
          {activeTab === 'orders' && (
            <div className="admin-orders-panel fade-in-up">
              <div className="admin-table-wrapper glass-card">
                <h2>All Transactions ({orders.length})</h2>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Template</th>
                      <th>Amount</th>
                      <th>Reference ID</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => (
                      <tr key={ord._id}>
                        <td><strong>{ord.user?.name}</strong><span className="table-subtext">{ord.user?.email}</span></td>
                        <td>{ord.template?.title}</td>
                        <td>₹{ord.amount}</td>
                        <td className="table-ref-id">{ord.orderId}</td>
                        <td>
                          <select
                            className={`status-select ${ord.status}`}
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord._id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Users list */}
          {activeTab === 'users' && (
            <div className="admin-users-panel fade-in-up">
              <div className="admin-table-wrapper glass-card">
                <h2>Registered Users ({users.length})</h2>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Member Since</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const signupDate = new Date(u.createdAt).toLocaleDateString();
                      return (
                        <tr key={u._id}>
                          <td><strong>{u.name}</strong></td>
                          <td>{u.email}</td>
                          <td><span className={`role-tag ${u.role}`}>{u.role}</span></td>
                          <td>{signupDate}</td>
                          <td>
                            {u.role !== 'admin' && (
                              <button onClick={() => handleDeleteUser(u._id)} className="btn btn-danger btn-xs">Delete</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 6: Inquiries list */}
          {activeTab === 'inquiries' && (
            <div className="admin-inquiries-panel fade-in-up">

              <div className="admin-table-wrapper glass-card mb-30">
                <h2>Custom Service Inquiries ({customDesigns.length})</h2>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Contact Details</th>
                      <th>Requirements Description</th>
                      <th>Reference File</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customDesigns.map((req) => (
                      <tr key={req._id}>
                        <td>
                          <strong>{req.name}</strong>
                          <span className="table-subtext">{req.email}</span>
                          <span className="table-subtext">{req.phone || 'No Phone'}</span>
                        </td>
                        <td className="table-desc-cell">{req.requirementsDescription}</td>
                        <td>
                          {req.referenceImage ? (
                            <a href={req.referenceImage} target="_blank" rel="noopener noreferrer" className="table-link">
                              View File &rarr;
                            </a>
                          ) : 'None'}
                        </td>
                        <td>
                          <select
                            className={`status-select ${req.status}`}
                            value={req.status}
                            onChange={(e) => handleUpdateCustomDesignStatus(req._id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="read">Read</option>
                            <option value="replied">Replied</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-table-wrapper glass-card">
                <h2>Contact Form Submissions ({contacts.length})</h2>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Sender</th>
                      <th>Subject</th>
                      <th>Message</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c._id}>
                        <td><strong>{c.name}</strong><span className="table-subtext">{c.email}</span></td>
                        <td><strong>{c.subject}</strong></td>
                        <td className="table-desc-cell">{c.message}</td>
                        <td>
                          <select
                            className={`status-select ${c.status}`}
                            value={c.status}
                            onChange={(e) => handleUpdateContactStatus(c._id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="read">Read</option>
                            <option value="replied">Replied</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
