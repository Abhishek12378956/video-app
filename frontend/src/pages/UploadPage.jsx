import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Film, X, CheckCircle, AlertCircle } from 'lucide-react';
import { videoAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatFileSize } from '../utils/format';
import './UploadPage.css';

const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/mpeg', 'video/3gpp'];
const MAX_SIZE = 500 * 1024 * 1024; // 500MB

const UploadPage = () => {
  const navigate  = useNavigate();
  const toast     = useToast();
  const fileRef   = useRef(null);

  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [fileError, setFileError] = useState('');

  const [form, setForm] = useState({
    title: '', description: '', category: 'Uncategorised', tags: '',
  });

  // ── File validation ──────────────────────────────────────────────
  const validateFile = (f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Invalid file type. Please upload a video file (MP4, WebM, AVI, MOV, MKV…)';
    }
    if (f.size > MAX_SIZE) {
      return `File too large. Maximum size is 500 MB (your file: ${formatFileSize(f.size)})`;
    }
    return null;
  };

  const selectFile = (f) => {
    const err = validateFile(f);
    if (err) { setFileError(err); setFile(null); return; }
    setFileError('');
    setFile(f);
    if (!form.title) setForm(prev => ({ ...prev, title: f.name.replace(/\.[^/.]+$/, '') }));
  };

  // ── Drag & drop ──────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) selectFile(dropped);
  }, [form.title]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file)        { toast.error('Please select a video file'); return; }
    if (!form.title)  { toast.error('Title is required'); return; }

    const fd = new FormData();
    fd.append('video', file);
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('category', form.category);
    fd.append('tags', form.tags);

    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await videoAPI.uploadVideo(fd, (e) => {
        if (e.total) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      setUploadDone(true);
      toast.success('Video uploaded! Processing has started.');
    
      // Wait a bit longer for video to be available
      setTimeout(() => navigate(`/videos/${res.video._id}`), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="upload-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload Video</h1>
          <p className="page-subtitle">Videos are automatically analysed for content sensitivity</p>
        </div>
      </div>

      <div className="upload-layout">
        {/* Drop zone */}
        <div
          className={`drop-zone ${dragging ? 'drop-zone-active' : ''} ${file ? 'drop-zone-filled' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !file && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            style={{ display: 'none' }}
            onChange={(e) => e.target.files[0] && selectFile(e.target.files[0])}
          />

          {file ? (
            <div className="file-preview">
              <div className="file-icon"><Film size={36} /></div>
              <div className="file-meta">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
              {!uploading && (
                <button
                  type="button"
                  className="file-remove"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setUploadProgress(0); }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          ) : (
            <div className="drop-prompt">
              <div className="drop-icon">
                <Upload size={32} />
              </div>
              <p className="drop-title">Drag & drop your video here</p>
              <p className="drop-sub">or click to browse</p>
              <div className="drop-formats">
                MP4 · WebM · AVI · MOV · MKV · MPEG
              </div>
              <div className="drop-limit">Max file size: 500 MB</div>
            </div>
          )}

          {fileError && (
            <div className="file-error">
              <AlertCircle size={14} />
              {fileError}
            </div>
          )}
        </div>

        {/* Form */}
        <form className="upload-form card" onSubmit={handleSubmit}>
          <h2 className="form-section-title">Video Details</h2>

          <div className="input-group">
            <label className="input-label">Title <span style={{ color: 'var(--flagged)' }}>*</span></label>
            <input
              className="input"
              type="text"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Give your video a clear title"
              maxLength={200}
              disabled={uploading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea
              className="input"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description…"
              rows={3}
              maxLength={1000}
              disabled={uploading}
            />
          </div>

          <div className="form-row">
            <div className="input-group">
              <label className="input-label">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                disabled={uploading}
              >
                {['Uncategorised','Marketing','Training','Product Demo','Webinar','Tutorial','Interview','Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Tags</label>
              <input
                className="input"
                type="text"
                value={form.tags}
                onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3"
                disabled={uploading}
              />
            </div>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="upload-progress">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {uploadDone ? 'Upload complete!' : 'Uploading…'}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--accent-light)', fontWeight: 600 }}>
                  {uploadProgress}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              {uploadDone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'var(--safe)' }}>
                  <CheckCircle size={16} />
                  <span style={{ fontSize: '0.875rem' }}>Redirecting to video…</span>
                </div>
              )}
            </div>
          )}

          {/* Info panel */}
          <div className="upload-info">
            <div className="upload-info-icon">⚡</div>
            <p className="upload-info-text">
              After uploading, your video will be automatically processed for content sensitivity analysis.
              You'll receive real-time progress updates on the video page.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/library')}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || !file || uploadDone}
            >
              {uploading ? (
                <><div className="spinner" style={{ width: 16, height: 16 }} /> Uploading…</>
              ) : (
                <><Upload size={16} /> Upload Video</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;
