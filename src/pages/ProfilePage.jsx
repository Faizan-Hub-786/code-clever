import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Camera,
  UploadCloud,
  Check,
  CheckCircle2,
  ShieldCheck,
  Save,
  PlusCircle,
  X,
  CreditCard,
  Edit3
} from 'lucide-react';
import Shell from '../components/layout/Shell';
import { API_BASE_URL, getAuthHeaders } from '../api/config';

export default function ProfilePage() {
  const nav = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar_url: '/assets/Characters/Male.jpg'
  });

  const [selectedPreset, setSelectedPreset] = useState('male'); // 'male' | 'female' | 'custom'
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/profile`, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          const avatar = d.avatar_url || d.avatar || '/assets/Characters/Male.jpg';
          setForm({
            full_name: d.full_name || d.name || 'Muhammad Faizan',
            email: d.email || 'faizan@example.com',
            phone: d.phone || '0300 1234567',
            avatar_url: avatar
          });

          if (avatar.includes('female.jpg')) {
            setSelectedPreset('female');
          } else if (avatar.includes('Male.jpg')) {
            setSelectedPreset('male');
          } else {
            setSelectedPreset('custom');
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    if (preset === 'male') {
      setForm((prev) => ({ ...prev, avatar_url: '/assets/Characters/Male.jpg' }));
    } else if (preset === 'female') {
      setForm((prev) => ({ ...prev, avatar_url: '/assets/Characters/female.jpg' }));
    } else if (preset === 'custom') {
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, avatar_url: reader.result }));
      setSelectedPreset('custom');
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const r = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          avatar_url: form.avatar_url
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed to save changes.');

      setToast('Profile updated successfully!');
      setTimeout(() => setToast(''), 4000);

      // Update user in localStorage
      try {
        const raw = JSON.parse(localStorage.getItem('cc_user') || '{}');
        localStorage.setItem(
          'cc_user',
          JSON.stringify({ ...raw, name: form.full_name, email: form.email, avatar: form.avatar_url })
        );
      } catch {}
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <div className="edit-profile-page">
        {/* Top Header */}
        <div className="edit-profile-top">
          <div className="edit-profile-title-wrap">
            <button className="back-circle-btn" onClick={() => nav(-1)}>
              <ArrowLeft size={20} />
            </button>
            <div className="edit-profile-title">
              <h1>Edit Profile</h1>
              <p>Manage your personal account information</p>
            </div>
          </div>
          <div className="edit-profile-illustration">
            <div className="glow-circle" />
            <Edit3 size={42} />
          </div>
        </div>

        {error && (
          <div className="auth-error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Card 1: Profile Picture */}
        <div className="profile-card-section">
          <div className="profile-card-head">
            <div className="profile-card-head-left">
              <div className="profile-card-icon">
                <User size={18} />
              </div>
              <div>
                <h2>Profile Picture</h2>
                <p>Choose an avatar or upload your own photo.</p>
              </div>
            </div>
          </div>

          <div className="avatar-selector-wrap">
            <div className="avatar-preview-box">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Selected Avatar" />
              ) : (
                <div className="avatar-initials">
                  {(form.full_name || 'CC').slice(0, 2).toUpperCase()}
                </div>
              )}
              <label className="avatar-cam-badge">
                <Camera size={16} />
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <div className="avatar-presets-grid">
              {/* Male Preset */}
              <div
                className={`avatar-preset-card ${selectedPreset === 'male' ? 'active' : ''}`}
                onClick={() => handleSelectPreset('male')}
              >
                {selectedPreset === 'male' && (
                  <div className="preset-check-badge">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <img src="/assets/Characters/Male.jpg" alt="Male Avatar" />
                <span>Male</span>
              </div>

              {/* Female Preset */}
              <div
                className={`avatar-preset-card ${selectedPreset === 'female' ? 'active' : ''}`}
                onClick={() => handleSelectPreset('female')}
              >
                {selectedPreset === 'female' && (
                  <div className="preset-check-badge">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <img src="/assets/Characters/female.jpg" alt="Female Avatar" />
                <span>Female</span>
              </div>

              {/* Upload Preset */}
              <div
                className={`avatar-preset-card ${selectedPreset === 'custom' ? 'active' : ''}`}
                onClick={() => handleSelectPreset('custom')}
              >
                {selectedPreset === 'custom' && (
                  <div className="preset-check-badge">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <div className="upload-avatar-icon">
                  <UploadCloud size={24} />
                </div>
                <span>Upload Photo</span>
              </div>
            </div>
          </div>

          <div
            className="avatar-upload-banner"
            onClick={() => fileInputRef.current?.click()}
          >
            <div>
              <PlusCircle size={16} />
              <span>Upload Your Photo</span>
            </div>
            <small>JPG, JPEG, PNG up to 5MB</small>
          </div>
        </div>

        {/* Card 2: Personal Information */}
        <div className="profile-card-section">
          <div className="profile-card-head">
            <div className="profile-card-head-left">
              <div className="profile-card-icon">
                <User size={18} />
              </div>
              <div>
                <h2>Personal Information</h2>
              </div>
            </div>
          </div>

          <div className="profile-input-field">
            <User size={18} className="field-icon" />
            <div className="field-content">
              <label>Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>
            {form.full_name && <CheckCircle2 size={18} className="valid-check" />}
          </div>

          <div className="profile-input-field">
            <Phone size={18} className="field-icon" />
            <div className="field-content">
              <label>Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="0300 1234567"
              />
            </div>
            {form.phone && <CheckCircle2 size={18} className="valid-check" />}
          </div>

          <div className="profile-input-field">
            <Mail size={18} className="field-icon" />
            <div className="field-content">
              <label>Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="faizan@example.com"
              />
            </div>
            {form.email && <CheckCircle2 size={18} className="valid-check" />}
          </div>
        </div>

        {/* Save Changes Button */}
        <button
          className="save-profile-btn"
          onClick={saveProfile}
          disabled={saving}
        >
          <Save size={20} />
          <span>{saving ? 'Saving Changes…' : 'Save Changes'}</span>
        </button>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              className="profile-toast-notice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <CheckCircle2 size={18} />
              <span>{toast}</span>
              <button onClick={() => setToast('')}>
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
