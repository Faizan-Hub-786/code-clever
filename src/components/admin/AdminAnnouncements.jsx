import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Power,
  Sparkles,
  Save,
  X,
  Eye,
  Radio,
  Clock
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';
import { normalizeImageUrl, getAppIconUrl } from '../../utils/formatters';
import DualImageUpload from '../common/DualImageUpload';

export default function AdminAnnouncements({ onAction }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Edit Mode state
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    message: '',
    imageUrl: '',
    actionUrl: 'https://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I',
    actionText: 'Join WhatsApp Channel',
    category: 'announcement', // 'official_channel' | 'video_guides' | 'announcement' | 'system_update'
    displayMode: 'every_visit', // 'every_visit' | 'once_per_session' | 'once_per_login'
    isPinned: false,
    active: true
  });

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/announcements`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      message: item.message || '',
      imageUrl: item.image_url || '',
      actionUrl: item.action_url || 'https://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I',
      actionText: item.action_text || 'Join WhatsApp Channel',
      category: item.category || 'announcement',
      displayMode: item.display_mode || 'every_visit',
      isPinned: Number(item.is_pinned) === 1,
      active: Number(item.active) === 1
    });
    setMsg(`Editing News / Announcement #${item.id}. Update fields below and click Save Changes.`);
    setError('');
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({
      title: '',
      message: '',
      imageUrl: '',
      actionUrl: 'https://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I',
      actionText: 'Join WhatsApp Channel',
      category: 'announcement',
      displayMode: 'every_visit',
      isPinned: false,
      active: true
    });
    setMsg('');
    setError('');
  };

  const applyChannelPreset = (presetType) => {
    if (presetType === 'updates') {
      setForm({
        ...form,
        title: 'Code-Clever Official Updates',
        message: 'Get the latest announcements, important updates, new features, maintenance alerts and everything about Code-Clever directly on WhatsApp.',
        imageUrl: '/assets/news/official_updates_channel.jpg',
        actionUrl: 'https://whatsapp.com/channel/0029VbDvBwe1NCrU5GW09A0I',
        actionText: 'Join Official WhatsApp Channel',
        category: 'official_channel',
        isPinned: true,
        active: true
      });
      setMsg('Loaded "Official Updates Channel" preset. You can tweak fields or save.');
    } else if (presetType === 'videos') {
      setForm({
        ...form,
        title: 'Code-Clever Guideline Videos',
        message: 'Learn. Understand. Earn. Watch step-by-step video tutorials for account registration, login, password reset, bot chatting, task evaluations, and fast withdrawals.',
        imageUrl: '/assets/news/guideline_videos_channel.jpg',
        actionUrl: 'https://whatsapp.com/channel/0029VbDfDEI4IBhBAAWEJG2M',
        actionText: 'Watch Guideline Videos',
        category: 'video_guides',
        isPinned: true,
        active: true
      });
      setMsg('Loaded "Guideline Videos Channel" preset. You can tweak fields or save.');
    } else if (presetType === 'youtube') {
      setForm({
        ...form,
        title: 'Code-Clever Official YouTube Channel',
        message: 'Watch certified full-length video tutorials, app evaluation walkthroughs, annual keynote conventions, partner webinars, and executive roadmap updates in HD.',
        imageUrl: '/assets/news/youtube_channel.jpg',
        actionUrl: 'https://www.youtube.com/@Code-Clever_Space',
        actionText: 'Subscribe on YouTube',
        category: 'official_channel',
        isPinned: true,
        active: true
      });
      setMsg('Loaded "YouTube Channel" preset.');
    } else if (presetType === 'instagram') {
      setForm({
        ...form,
        title: 'Code-Clever Official Instagram',
        message: 'Follow our official Instagram handle (@code.clever.space) for daily platform highlights, member payout proofs, behind-the-scenes engineering stories, and community giveaway contests.',
        imageUrl: '/assets/news/instagram_channel.jpg',
        actionUrl: 'https://www.instagram.com/code.clever.space/',
        actionText: 'Follow on Instagram',
        category: 'official_channel',
        isPinned: true,
        active: true
      });
      setMsg('Loaded "Instagram Profile" preset.');
    } else if (presetType === 'tiktok') {
      setForm({
        ...form,
        title: 'Code-Clever Official TikTok',
        message: 'Join our viral creator community on TikTok (@code.clever)! Discover 60-second micro-earning hacks, registration shortcuts, task evaluation strategies, and celebration videos.',
        imageUrl: '/assets/news/tiktok_channel.jpg',
        actionUrl: 'https://www.tiktok.com/@code.clever',
        actionText: 'Follow on TikTok',
        category: 'official_channel',
        isPinned: true,
        active: true
      });
      setMsg('Loaded "TikTok Channel" preset.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('News / Announcement title is required.');
      return;
    }
    if (!form.message.trim()) {
      setError('News / Announcement message text is required.');
      return;
    }

    setSubmitting(true);
    setMsg('');
    setError('');

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      imageUrl: form.imageUrl ? normalizeImageUrl(form.imageUrl) : null,
      actionUrl: form.actionUrl ? form.actionUrl.trim() : null,
      actionText: form.actionText ? form.actionText.trim() : 'Join WhatsApp Channel',
      category: form.category || 'announcement',
      displayMode: form.displayMode,
      isPinned: form.isPinned,
      active: form.active
    };

    try {
      if (editingId) {
        // UPDATE
        const res = await fetch(`${API_BASE_URL}/admin/announcements/${editingId}`, {
          method: 'PUT',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update news / announcement');

        setMsg(`News item "${form.title}" updated successfully!`);
        handleCancelEdit();
        fetchAnnouncements();
      } else {
        // CREATE
        const res = await fetch(`${API_BASE_URL}/admin/announcements`, {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to publish news / announcement');

        setMsg(`News item "${form.title}" published successfully!`);
        handleCancelEdit();
        fetchAnnouncements();
      }
      if (onAction) onAction();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/announcements/${id}/toggle`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchAnnouncements();
        if (onAction) onAction();
      }
    } catch (err) {
      console.error('Failed to toggle announcement:', err);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete announcement "${title}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        if (editingId === id) handleCancelEdit();
        setMsg(`Announcement deleted.`);
        fetchAnnouncements();
        if (onAction) onAction();
      }
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  return (
    <div className="admin-announcements-page">
      <div className="admin-section-head">
        <div>
          <h2>Announcements & Broadcasts</h2>
          <p>Create global pop-up announcements, official WhatsApp channel broadcasts, and system updates for members.</p>
        </div>
      </div>

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

      {/* CREATE / EDIT FORM CARD */}
      <div className="admin-announcement-form-card">
        <div className="card-title-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingId ? (
              <Edit3 size={20} className="icon-purple" />
            ) : (
              <Megaphone size={20} className="icon-purple" />
            )}
            <h3 style={{ margin: 0 }}>
              {editingId ? `Edit News Article / Announcement` : `Publish News or Announcement`}
              {editingId && (
                <span style={{ fontSize: 12, color: '#cb4eff', marginLeft: 8, fontWeight: 700 }}>
                  (ID #{editingId})
                </span>
              )}
            </h3>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => applyChannelPreset('updates')}
              className="cc-btn-purple"
              style={{ padding: '6px 12px', fontSize: 11.5, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Megaphone size={12} /> Fill Updates Channel Preset
            </button>
            <button
              type="button"
              onClick={() => applyChannelPreset('videos')}
              className="cc-btn-purple"
              style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Radio size={12} /> Video Guides
            </button>
            <button
              type="button"
              onClick={() => applyChannelPreset('youtube')}
              className="cc-btn-purple"
              style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(239, 68, 68, 0.4)' }}
            >
              📺 YouTube
            </button>
            <button
              type="button"
              onClick={() => applyChannelPreset('instagram')}
              className="cc-btn-purple"
              style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(236, 72, 153, 0.4)' }}
            >
              📸 Instagram
            </button>
            <button
              type="button"
              onClick={() => applyChannelPreset('tiktok')}
              className="cc-btn-purple"
              style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(6, 182, 212, 0.4)' }}
            >
              🎵 TikTok
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-announcement-form">
          {/* Category & Title Row */}
          <div className="form-row-2">
            <div className="form-group">
              <label>News Category</label>
              <select
                className="filter-select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="official_channel">Official Announcement Channel</option>
                <option value="video_guides">Official Video Guides Channel</option>
                <option value="announcement">Platform Announcement</option>
                <option value="system_update">System Update / Maintenance</option>
              </select>
            </div>

            <div className="form-group">
              <label>Article / Announcement Title</label>
              <input
                type="text"
                required
                className="cc-input"
                placeholder="Title (e.g. Code-Clever Official Updates)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
          </div>

          {/* Message (Multiline) */}
          <div className="form-group">
            <label>Content / Message Text (supports multiline text)</label>
            <textarea
              required
              rows={4}
              className="cc-textarea"
              placeholder="Announcement message text (e.g. Join our official verified WhatsApp channel for instant daily task signals, withdrawal proofs, and bonus giveaways...)"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          {/* Dual Image Upload */}
          <DualImageUpload
            label="Upload Image / Banner (Optional)"
            fileLabel="Upload Image (from Device)"
            urlLabel="Or Image / Google Drive URL"
            value={form.imageUrl || ''}
            onChange={(val) => setForm({ ...form, imageUrl: val })}
            placeholder="Paste image / Google Drive share link (or /assets/news/official_updates_channel.jpg)..."
          />

          {/* Action Link & Action Button Text (2 Columns) */}
          <div className="form-row-2">
            <div className="form-group">
              <label>Action Link URL (WhatsApp Channel / Guide)</label>
              <input
                type="url"
                className="cc-input"
                placeholder="Action link URL (e.g. https://whatsapp.com/channel/...)"
                value={form.actionUrl}
                onChange={(e) => setForm({ ...form, actionUrl: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Action Button Text</label>
              <input
                type="text"
                className="cc-input"
                placeholder="e.g. Join Official WhatsApp Channel"
                value={form.actionText}
                onChange={(e) => setForm({ ...form, actionText: e.target.value })}
              />
            </div>
          </div>

          {/* Frequency & Active / Pinned Checkbox Row */}
          <div className="form-row-2" style={{ alignItems: 'center' }}>
            <div className="form-group">
              <label>Pop-up Display Frequency</label>
              <select
                className="filter-select"
                value={form.displayMode}
                onChange={(e) => setForm({ ...form, displayMode: e.target.value })}
              >
                <option value="every_visit">Display on every visit to home page</option>
                <option value="once_per_session">Display once per browser session</option>
                <option value="once_per_login">Display once until user dismisses</option>
              </select>
            </div>

            <div className="form-group" style={{ paddingTop: 18, display: 'flex', gap: 20 }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#cb4eff' }}
                />
                <b style={{ color: '#f5d0fe', fontSize: 13 }}>📌 Pin to Top</b>
              </label>

              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#10b981' }}
                />
                <b style={{ color: '#fff', fontSize: 13 }}>Active (Published)</b>
              </label>
            </div>
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="task-form-btn-row" style={{ marginTop: 10 }}>
            <button
              type="submit"
              className={editingId ? 'gradient-btn' : 'cc-btn-green'}
              disabled={submitting}
              style={{ flex: 1, height: 46 }}
            >
              {editingId ? (
                <>
                  <Save size={17} />
                  <span>{submitting ? 'Saving Changes…' : 'Save Changes'}</span>
                </>
              ) : (
                <>
                  <Megaphone size={17} />
                  <span>{submitting ? 'Publishing…' : 'Publish Article / Announcement'}</span>
                </>
              )}
            </button>

            {editingId && (
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

      {/* ALL ANNOUNCEMENTS TABLE */}
      <div className="admin-announcements-list-card">
        <div className="card-title-wrap">
          <Sparkles size={20} className="icon-purple" />
          <h3>All News & Announcements ({announcements.length})</h3>
        </div>

        <div className="admin-table-wrap" style={{ marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Banner</th>
                <th>Category</th>
                <th>Title & Message</th>
                <th>Link / Button</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    {loading ? 'Loading news & announcements…' : 'No news or announcements published yet.'}
                  </td>
                </tr>
              ) : (
                announcements.map((a) => {
                  const isActive = Number(a.active) === 1;
                  const isPinned = Number(a.is_pinned) === 1;
                  const isEditing = editingId === a.id;

                  return (
                    <tr key={a.id} className={isEditing ? 'row-editing' : ''}>
                      <td>
                        {a.image_url ? (
                          <img
                            src={getAppIconUrl(a.image_url, a.title)}
                            alt={a.title}
                            style={{
                              width: 50,
                              height: 38,
                              borderRadius: 6,
                              objectFit: 'cover',
                              border: '1px solid #4a2872'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span style={{ color: '#7e778f', fontSize: 11 }}>No image</span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            background: a.category === 'video_guides' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                            color: a.category === 'video_guides' ? '#f472b6' : '#d8b4fe',
                            border: `1px solid ${a.category === 'video_guides' ? '#ec4899' : '#a855f7'}40`,
                            padding: '3px 8px',
                            borderRadius: 10,
                            fontSize: 10.5,
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {a.category === 'official_channel'
                            ? 'Official Channel'
                            : a.category === 'video_guides'
                            ? 'Video Guides'
                            : a.category === 'system_update'
                            ? 'System Update'
                            : 'Announcement'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <b style={{ color: '#fff', fontSize: 13 }}>{a.title}</b>
                          {isPinned && (
                            <span style={{ background: '#f59e0b20', color: '#fbbf24', border: '1px solid #f59e0b40', fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                              📌 Pinned
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: 11.5, margin: '3px 0 0', lineHeight: 1.35, whiteSpace: 'pre-line' }}>
                          {a.message.length > 110 ? a.message.slice(0, 110) + '…' : a.message}
                        </p>
                      </td>
                      <td>
                        {a.action_url ? (
                          <a
                            href={a.action_url}
                            target="_blank"
                            rel="noreferrer"
                            className="proof-link"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}
                          >
                            <span>{a.action_text || 'Open Link'}</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span style={{ color: '#7e778f', fontSize: 11 }}>None</span>
                        )}
                      </td>
                      <td>
                        <span className={`task-status-pill ${isActive ? 'active' : 'inactive'}`}>
                          {isActive ? 'Published' : 'Draft / Off'}
                        </span>
                      </td>
                      <td>
                        <small>{a.created_date || 'Recent'}</small>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className="task-edit-icon-btn"
                            onClick={() => handleStartEdit(a)}
                            title="Edit Announcement"
                          >
                            <Edit3 size={11} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className={`task-toggle-btn ${isActive ? 'active' : 'inactive'}`}
                            onClick={() => handleToggle(a.id)}
                            title={isActive ? 'Deactivate Announcement' : 'Activate Announcement'}
                          >
                            {isActive ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            type="button"
                            className="task-delete-icon-btn"
                            onClick={() => handleDelete(a.id, a.title)}
                            title="Delete Announcement"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
