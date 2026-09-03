import React, { useState } from 'react';
import { Upload, Link2, Trash2, Check, Sparkles, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { normalizeImageUrl } from '../../utils/formatters';
import { API_BASE_URL } from '../../api/config';

export default function DualImageUpload({
  label = 'Upload Image',
  fileLabel = 'Upload Cover Image (File)',
  urlLabel = 'Or Image / Cloudinary / Google Drive URL',
  value = '',
  onChange,
  hint = '💡 Supports high-res screenshots, receipts, JPEG, PNG, WebP (Max 5MB).',
  placeholder = 'Paste image link or Google Drive URL...'
}) {
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large (maximum limit is 5MB).');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Invalid file format. Please upload JPEG, PNG, or WebP image.');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = sessionStorage.getItem('cc_token') || localStorage.getItem('cc_token');
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          if (onChange) onChange(data.url);
          setIsUploading(false);
          return;
        }
      }

      // If server upload returned error or in offline fallback mode:
      const reader = new FileReader();
      reader.onload = () => {
        if (onChange) onChange(reader.result);
        setIsUploading(false);
      };
      reader.onerror = () => {
        setError('Failed to process image file.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Direct upload notice, using local preview:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (onChange) onChange(reader.result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setError('');
    if (onChange) onChange(val);
  };

  const handleClear = () => {
    setError('');
    if (onChange) onChange('');
  };

  const normalizedSrc = normalizeImageUrl(value);

  return (
    <div className="dual-image-upload-wrap">
      {/* 1. File Upload (Top) */}
      <div className="dual-upload-col">
        <label className="dual-upload-label">{fileLabel}</label>
        <div className="file-btn-wrapper" style={{ position: 'relative' }}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={isUploading}
            className="native-file-input"
            id={`dual-file-${label.replace(/\s+/g, '-').toLowerCase()}`}
            onChange={handleFile}
          />
          {isUploading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(20, 9, 41, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '10px',
                color: '#e879f9',
                fontSize: '12px',
                fontWeight: 600,
                zIndex: 5
              }}
            >
              <Loader2 size={16} className="spin" />
              <span>Optimizing & Uploading to Cloudinary...</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. URL / Google Drive Link (Directly Below) */}
      <div className="dual-upload-col" style={{ marginTop: '6px' }}>
        <label className="dual-upload-label">{urlLabel}</label>
        <input
          type="text"
          className="cc-input dual-url-input"
          placeholder={placeholder}
          value={value || ''}
          onChange={handleUrlChange}
        />
        {hint && <span className="dual-upload-hint">{hint}</span>}
      </div>

      {/* Error Message */}
      {error && <span className="dual-upload-error">{error}</span>}

      {/* Preview and Clear Button Area */}
      {value ? (
        <div className="dual-preview-container">
          <div className="dual-preview-thumb-box">
            <img
              src={normalizedSrc}
              alt="Uploaded Preview"
              className="dual-preview-thumb"
              onError={(e) => {
                const currentSrc = e.currentTarget.src;
                const fileMatch =
                  value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  value.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                  value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (fileMatch && fileMatch[1]) {
                  const fid = fileMatch[1];
                  if (currentSrc.includes('thumbnail')) {
                    e.currentTarget.src = `https://lh3.googleusercontent.com/d/${fid}`;
                    return;
                  } else if (currentSrc.includes('googleusercontent')) {
                    e.currentTarget.src = `https://drive.google.com/uc?export=view&id=${fid}`;
                    return;
                  }
                }
                if (!currentSrc.includes('/api/proxy-image') && value.startsWith('http')) {
                  e.currentTarget.src = `${API_BASE_URL}/proxy-image?url=${encodeURIComponent(value)}`;
                }
              }}
            />
          </div>
          <button type="button" className="dual-clear-btn" onClick={handleClear}>
            Clear Image
          </button>
        </div>
      ) : null}
    </div>
  );
}
