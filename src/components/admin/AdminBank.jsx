import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  Link2,
  Trash2,
  Eye,
  Check,
  Power,
  PlusCircle,
  QrCode
} from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../../api/config';
import { normalizeImageUrl } from '../../utils/formatters';
import DualImageUpload from '../common/DualImageUpload';

let cachedBankMethods = null;

export default function AdminBank() {
  const [methods, setMethods] = useState(() => cachedBankMethods || []);
  const [loading, setLoading] = useState(!cachedBankMethods);
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Upload mode per method: 'file' | 'link'
  const [uploadModes, setUploadModes] = useState({});

  const loadMethods = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/bank/methods`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        cachedBankMethods = list;
        setMethods(list);
      }
    } catch (err) {
      console.error('Failed to load bank methods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const handleFieldChange = (id, field, value) => {
    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleFileUpload = (id, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large (max 5MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      handleFieldChange(id, 'qrCode', reader.result);
      setMsg(`QR code image loaded for ${id}. Remember to click Save.`);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleStatus = (id) => {
    setMethods((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === 'active' ? 'inactive' : 'active';
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
  };

  const handleSaveMethod = async (method) => {
    setMsg('');
    setError('');
    setSavingId(method.id);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/bank/save-method`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ...method,
          qrCode: normalizeImageUrl(method.qrCode)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save bank settings');
      setMsg(data.message || `${method.name} saved successfully.`);
      loadMethods();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="admin-bank-section">
      {/* Header */}
      <div className="admin-section-head">
        <div>
          <h2>Bank / Recharge Settings</h2>
          <p>Configure receiving accounts, payment instructions, and QR codes for user deposits.</p>
        </div>
      </div>

      {/* Notice Bar matching Screenshot */}
      <div className="bank-notice-bar">
        <span>
          Change the receiving account, upload payment QR codes, or remove QR codes used on the public Recharge page. Changes apply immediately after saving.
        </span>
      </div>

      {/* Global Alerts */}
      <AnimatePresence>
        {msg && (
          <motion.div
            className="admin-cc-alert success"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CheckCircle2 size={18} />
            <span>{msg}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            className="admin-cc-alert error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bank Cards Grid */}
      <div className="bank-methods-grid">
        {methods.map((method) => {
          const currentMode = uploadModes[method.id] || 'file';
          const isActive = method.status === 'active';

          return (
            <div key={method.id} className="bank-method-card">
              {/* Card Header with Status Toggle */}
              <div className="bank-card-header">
                <div className="bank-card-title-wrap">
                  {method.logo ? (
                    <img src={method.logo} alt={method.name} className="bank-card-logo" />
                  ) : (
                    <div className="bank-card-icon-circle">
                      <Landmark size={18} />
                    </div>
                  )}
                  <h3>{method.name}</h3>
                </div>

                <button
                  type="button"
                  className={`bank-status-badge ${isActive ? 'active' : 'inactive'}`}
                  onClick={() => handleToggleStatus(method.id)}
                  title="Click to toggle active/inactive"
                >
                  <Power size={11} />
                  <span>{isActive ? 'Active' : 'Inactive'}</span>
                </button>
              </div>

              {/* Form Fields */}
              <div className="bank-card-body">
                <div className="form-group">
                  <label>Account label</label>
                  <input
                    type="text"
                    className="cc-input"
                    value={method.accountLabel || ''}
                    onChange={(e) => handleFieldChange(method.id, 'accountLabel', e.target.value)}
                    placeholder="e.g. JazzCash Business Till"
                  />
                </div>

                <div className="form-group">
                  <label>Account number / address</label>
                  <input
                    type="text"
                    className="cc-input"
                    value={method.accountNumber || ''}
                    onChange={(e) => handleFieldChange(method.id, 'accountNumber', e.target.value)}
                    placeholder="e.g. 03254138875"
                  />
                </div>

                <div className="form-group">
                  <label>Account title / Beneficiary Name</label>
                  <input
                    type="text"
                    className="cc-input"
                    value={method.accountName || ''}
                    onChange={(e) => handleFieldChange(method.id, 'accountName', e.target.value)}
                    placeholder="e.g. Code Clever Treasury"
                  />
                </div>

                <div className="form-group">
                  <label>Payment instructions</label>
                  <textarea
                    className="cc-textarea"
                    rows={2}
                    value={method.instructions || ''}
                    onChange={(e) => handleFieldChange(method.id, 'instructions', e.target.value)}
                    placeholder="Pay to the business till and upload your payment screenshot."
                  />
                </div>

                {/* DUAL IMAGE UPLOAD (FILE + DRIVE / URL) */}
                <DualImageUpload
                  label={method.name}
                  fileLabel="Upload QR Code (File)"
                  urlLabel="Or Image / Google Drive URL"
                  value={method.qrCode || ''}
                  onChange={(val) => handleFieldChange(method.id, 'qrCode', val)}
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                />

                {/* Save Button */}
                <button
                  type="button"
                  className="cc-btn-green save-bank-btn"
                  disabled={savingId === method.id}
                  onClick={() => handleSaveMethod(method)}
                >
                  <Save size={16} />
                  <span>
                    {savingId === method.id ? 'Saving Changes...' : `Save ${method.name}`}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
