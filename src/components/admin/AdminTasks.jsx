import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Upload,
  Link2,
  Trash2,
  Check,
  CheckCircle2,
  AlertCircle,
  Search,
  Layers,
  Sparkles,
  ExternalLink,
  Power,
  Image as ImageIcon,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';
import { normalizeImageUrl, getAppIconUrl } from '../../utils/formatters';
import DualImageUpload from '../common/DualImageUpload';

const CATEGORIES = [
  'E-commerce',
  'Finance',
  'Social',
  'Gaming',
  'Entertainment',
  'Crypto',
  'Utility',
  'Productivity',
  'Streaming'
];

let cachedAdminTasks = null;

export default function AdminTasks({ library: initialLibrary, onAction }) {
  const [tasks, setTasks] = useState(() => cachedAdminTasks || initialLibrary || []);
  const [loading, setLoading] = useState(!cachedAdminTasks && (!initialLibrary || !initialLibrary.length));
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Editing state: null when adding, task object when editing
  const [editingTask, setEditingTask] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    category: 'E-commerce',
    appUrl: '',
    description: '',
    appIcon: '',
    verificationType: 'proof'
  });

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/task-library`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        cachedAdminTasks = list;
        setTasks(list);
      }
    } catch (err) {
      console.error('Failed to fetch task library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStartEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || '',
      category: task.category || 'E-commerce',
      appUrl: task.app_url || '',
      description: task.description || '',
      appIcon: task.app_icon || '',
      verificationType: task.verification_type || 'proof'
    });
    setMsg(`Editing "${task.title}". Modify the form on the left and save changes.`);
    setError('');
    // Scroll smoothly to form
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setForm({
      title: '',
      category: 'E-commerce',
      appUrl: '',
      description: '',
      appIcon: '',
      verificationType: 'proof'
    });
    setMsg('');
    setError('');
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('App title is required.');
      return;
    }
    if (!form.description.trim()) {
      setError('Instructions / Description is required.');
      return;
    }

    setSubmitting(true);
    setMsg('');
    setError('');

    const payload = {
      title: form.title.trim(),
      category: form.category,
      appUrl: form.appUrl ? form.appUrl.trim() : null,
      description: form.description.trim(),
      appIcon: form.appIcon ? normalizeImageUrl(form.appIcon) : 'Apps Icons/04afefd3-aaf3-4d08-86e9-3c1281220097.jpg',
      verificationType: form.verificationType
    };

    try {
      if (editingTask) {
        // UPDATE existing task
        const res = await fetch(`${API_BASE_URL}/admin/task-library/${editingTask.id}`, {
          method: 'PUT',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update task');

        setMsg(`App "${form.title}" updated successfully!`);
        handleCancelEdit();
        fetchTasks();
      } else {
        // CREATE new task
        const res = await fetch(`${API_BASE_URL}/admin/task-library`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to add task');

        setMsg(`App "${form.title}" added to active task library!`);
        setForm({
          title: '',
          category: 'E-commerce',
          appUrl: '',
          description: '',
          appIcon: '',
          verificationType: 'proof'
        });
        fetchTasks();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/task-library/${taskId}/toggle`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${taskTitle}" from task library?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/task-library/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        if (editingTask?.id === taskId) {
          handleCancelEdit();
        }
        setMsg(`Task "${taskTitle}" removed.`);
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      (t.title && t.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="admin-tasks-page">
      {/* Header */}
      <div className="admin-section-head">
        <div>
          <h2>Task Control & Library</h2>
          <p>Manage app download, rating and review opportunities, upload app icons, and configure daily task rewards.</p>
        </div>
      </div>

      {/* Alerts */}
      {msg && (
        <div className="admin-cc-alert success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={18} /> <span>{msg}</span>
        </div>
      )}
      {error && (
        <div className="admin-cc-alert error" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Add/Edit Form (Left) & Task Library (Right) */}
      <div className="task-manager-layout">
        {/* ADD / EDIT TASK FORM */}
        <div className="task-form-card">
          <div className="card-title-wrap">
            {editingTask ? (
              <Edit3 size={20} className="icon-purple" />
            ) : (
              <PlusCircle size={20} className="icon-purple" />
            )}
            <h3>
              {editingTask ? `Edit App Opportunity` : `Add New App Opportunity`}
              {editingTask && (
                <span style={{ fontSize: 12, color: '#cb4eff', marginLeft: 8, fontWeight: 700 }}>
                  (ID #{editingTask.id})
                </span>
              )}
            </h3>
          </div>
          <p className="card-sub-text">
            {editingTask
              ? `Modify app information, category, links, verification type, or cover image.`
              : `Add an application to the daily task rotation for active subscribed members.`}
          </p>

          <form onSubmit={handleSubmitTask} className="task-form-body">
            {/* App Title */}
            <div className="form-group">
              <label>App Title</label>
              <input
                type="text"
                required
                className="cc-input"
                placeholder="e.g. Daraz Shopping, Spotify Music..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Category & Verification Type in 2 cols */}
            <div className="form-row-2">
              <div className="form-group">
                <label>Category</label>
                <select
                  className="filter-select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Verification Method</label>
                <select
                  className="filter-select"
                  value={form.verificationType}
                  onChange={(e) => setForm({ ...form, verificationType: e.target.value })}
                >
                  <option value="proof">Screenshot Proof</option>
                  <option value="link">Link Submission</option>
                  <option value="manual">Manual Approval</option>
                </select>
              </div>
            </div>

            {/* App URL (Optional) */}
            <div className="form-group">
              <label>App / PlayStore Link (Optional)</label>
              <input
                type="url"
                className="cc-input"
                placeholder="https://play.google.com/store/apps/details?id=..."
                value={form.appUrl}
                onChange={(e) => setForm({ ...form, appUrl: e.target.value })}
              />
            </div>

            {/* Instructions / Description */}
            <div className="form-group">
              <label>Instructions / Description</label>
              <textarea
                required
                rows={3}
                className="cc-textarea"
                placeholder="Download the app from store, rate 5-stars, and upload the completion screenshot."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* DUAL IMAGE UPLOAD (FILE + DRIVE / URL) */}
            <DualImageUpload
              label="App Icon"
              fileLabel="Upload Cover Image (File)"
              urlLabel="Or Image / Google Drive URL"
              value={form.appIcon || ''}
              onChange={(val) => setForm({ ...form, appIcon: val })}
              placeholder="Paste image / Google Drive URL..."
            />

            {/* Submit & Cancel Button Row */}
            <div className="task-form-btn-row">
              <button
                type="submit"
                className={editingTask ? 'gradient-btn' : 'cc-btn-green'}
                disabled={submitting}
                style={{ flex: 1, height: 44 }}
              >
                {editingTask ? (
                  <>
                    <Save size={16} />
                    <span>{submitting ? 'Saving Changes...' : 'Save Changes'}</span>
                  </>
                ) : (
                  <>
                    <PlusCircle size={16} />
                    <span>{submitting ? 'Adding Task...' : 'Add App to Pool'}</span>
                  </>
                )}
              </button>

              {editingTask && (
                <button
                  type="button"
                  className="task-cancel-edit-btn"
                  onClick={handleCancelEdit}
                >
                  <X size={15} />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ACTIVE LIBRARY POOL */}
        <div className="task-pool-card">
          <div className="pool-header-line">
            <div>
              <h3>Active Library Pool ({filteredTasks.length})</h3>
              <p className="card-sub-text">Current app pool available for user daily assignments.</p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="task-filter-toolbar">
            <div className="task-search-box">
              <Search size={14} className="task-search-icon" />
              <input
                type="text"
                className="task-search-input"
                placeholder="Search app title, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              style={{ width: 140 }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Tasks List */}
          <div className="task-items-list">
            {filteredTasks.length === 0 ? (
              <div className="empty-table-cell" style={{ textAlign: 'center', padding: '30px 15px' }}>
                {loading ? 'Loading task library...' : 'No tasks matching your search filter.'}
              </div>
            ) : (
              filteredTasks.map((t) => {
                const isActive = Number(t.active) === 1;
                const isEditing = editingTask?.id === t.id;
                const iconSrc = getAppIconUrl(t.app_icon, t.title);

                return (
                  <div
                    key={t.id}
                    className={`task-item-card ${isActive ? 'active' : 'inactive'} ${isEditing ? 'editing' : ''}`}
                  >
                    {/* Top Row: App Icon + Title + Category + Actions */}
                    <div className="task-card-top-row">
                      <div className="task-card-identity">
                        <img
                          src={iconSrc}
                          alt={t.title}
                          className="task-app-logo"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.title || 'App')}&background=7c18eb&color=fff&size=80&bold=true`;
                          }}
                        />
                        <div className="task-card-titles">
                          <h4>{t.title}</h4>
                          <div className="task-badges-row">
                            <span className="task-cat-badge">{t.category}</span>
                            <span className={`task-status-pill ${isActive ? 'active' : 'inactive'}`}>
                              {isActive ? 'Active' : 'Disabled'}
                            </span>
                            {isEditing && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 99,
                                  background: '#cb4eff',
                                  color: '#fff'
                                }}
                              >
                                Editing
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="task-item-actions">
                        {/* Edit Button */}
                        <button
                          type="button"
                          className="task-edit-icon-btn"
                          onClick={() => handleStartEdit(t)}
                          title="Edit Task Details"
                        >
                          <Edit3 size={11} />
                          <span>Edit</span>
                        </button>

                        {/* Enable/Disable Toggle */}
                        <button
                          type="button"
                          className={`task-toggle-btn ${isActive ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleActive(t.id)}
                          title={isActive ? 'Disable Task' : 'Enable Task'}
                        >
                          {isActive ? 'Disable' : 'Enable'}
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          className="task-delete-icon-btn"
                          onClick={() => handleDeleteTask(t.id, t.title)}
                          title="Delete Task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Description & Link */}
                    {t.description && (
                      <p className="task-item-desc">{t.description}</p>
                    )}

                    {t.app_url && (
                      <div className="task-card-footer">
                        <a
                          href={t.app_url}
                          target="_blank"
                          rel="noreferrer"
                          className="task-app-link"
                        >
                          <ExternalLink size={11} /> PlayStore / URL
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
