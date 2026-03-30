import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize,
  AlertTriangle, CheckCircle, Clock, Edit3, Trash2, Save, X,
  Film, Eye, Calendar, HardDrive, Loader
} from 'lucide-react';
import { videoAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import { formatFileSize, formatDuration, formatDate, sensitivityLabel } from '../utils/format';
import './VideoPage.css';

const VideoPage = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();
  const { isEditor, isAdmin } = useAuth();
  const { on }   = useSocket();

  const [video, setVideo]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Fetch video
  const fetchVideo = useCallback(async () => {
    try {
      const res = await videoAPI.getVideo(id);
      setVideo(res.video);
      setEditForm({
        title: res.video.title,
        description: res.video.description || '',
        category: res.video.category || 'Uncategorised',
        tags: (res.video.tags || []).join(', '),
      });
    } catch (err) {
      // If video is still processing, show appropriate message
      if (err.response?.status === 404) {
        toast.error('Video not found. It may still be processing. Please try again in a moment.');
        // Try again after 2 seconds
        setTimeout(() => fetchVideo(), 2000);
      } else {
        toast.error(err.response?.data?.message || 'Video not found');
        navigate('/library');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchVideo(); }, [fetchVideo]);

  // Real-time processing updates
  useEffect(() => {
    const offProgress = on('video:progress', ({ videoId, progress, message }) => {
      if (videoId !== id) return;
      setVideo(v => v ? { ...v, processingProgress: progress, _progressMsg: message } : v);
    });

    const offStatus = on('video:statusChange', ({ videoId, status, sensitivity }) => {
      if (videoId !== id) return;
      setVideo(v => v ? { ...v, status, sensitivity } : v);
    });

    const offComplete = on('video:complete', (data) => {
      if (data.videoId !== id) return;
      fetchVideo();
      toast.success(`Processing complete — ${data.sensitivity}`);
    });

    const offError = on('video:error', ({ videoId }) => {
      if (videoId !== id) return;
      setVideo(v => v ? { ...v, status: 'failed' } : v);
    });

    return () => { offProgress?.(); offStatus?.(); offComplete?.(); offError?.(); };
  }, [id, on]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await videoAPI.updateVideo(id, editForm);
      setVideo(res.video);
      setEditing(false);
      toast.success('Video updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${video.title}"? This is permanent.`)) return;
    setDeleting(true);
    try {
      await videoAPI.deleteVideo(id);
      toast.success('Video deleted');
      navigate('/library');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      setDeleting(false);
    }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <div className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
    </div>
  );

  if (!video) return null;

  const canEdit   = isEditor && (isAdmin || video.uploadedBy?._id === video.uploadedBy?._id);
  const canStream = video.status === 'completed';

  return (
    <div className="video-page fade-in">
      {/* Back */}
      <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="video-layout">
        {/* Left column */}
        <div className="video-main">
          {/* Player */}
          <div className="player-wrap">
            {canStream ? (
              <VideoPlayer src={videoAPI.getStreamUrl(id)} />
            ) : (
              <div className="player-placeholder">
                {video.status === 'processing' && (
                  <div className="processing-overlay">
                    <Loader size={36} className="spin-anim" />
                    <p className="proc-title">Processing your video…</p>
                    <p className="proc-msg">{video._progressMsg || 'Analysing content'}</p>
                    <div className="proc-progress">
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div className="progress-fill" style={{ width: `${video.processingProgress || 0}%` }} />
                      </div>
                      <span>{video.processingProgress || 0}%</span>
                    </div>
                  </div>
                )}
                {video.status === 'failed' && (
                  <div className="processing-overlay">
                    <AlertTriangle size={36} color="var(--flagged)" />
                    <p className="proc-title" style={{ color:'var(--flagged)' }}>Processing Failed</p>
                    <p className="proc-msg">Something went wrong during video analysis</p>
                  </div>
                )}
                {video.status === 'uploading' && (
                  <div className="processing-overlay">
                    <Clock size={36} color="var(--pending)" />
                    <p className="proc-title">Video uploaded</p>
                    <p className="proc-msg">Preparing for processing…</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title & actions */}
          {editing ? (
            <div className="edit-block card">
              <div className="input-group">
                <label className="input-label">Title</label>
                <input className="input" value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="input" rows={3} value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select className="input" value={editForm.category}
                    onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                    {['Uncategorised','Marketing','Training','Product Demo','Webinar','Tutorial','Interview','Other'].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Tags (comma-separated)</label>
                  <input className="input" value={editForm.tags}
                    onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} />
                </div>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                  <X size={14} /> Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? <div className="spinner" style={{ width:14, height:14 }} /> : <Save size={14} />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="video-title-block">
              <div style={{ flex:1, minWidth:0 }}>
                <h1 className="video-title">{video.title}</h1>
                {video.description && <p className="video-desc">{video.description}</p>}
              </div>
              {canEdit && (
                <div className="video-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                    <Edit3 size={14} /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <div className="spinner" style={{width:14,height:14}} /> : <Trash2 size={14} />}
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="video-sidebar">
          {/* Sensitivity result */}
          <div className={`sensitivity-card card sensitivity-${video.sensitivity}`}>
            <div className="sensitivity-header">
              {video.sensitivity === 'safe'    && <CheckCircle size={20} color="var(--safe)" />}
              {video.sensitivity === 'flagged' && <AlertTriangle size={20} color="var(--flagged)" />}
              {video.sensitivity === 'pending' && <Clock size={20} color="var(--pending)" />}
              <span className="sensitivity-label">Content Analysis</span>
            </div>
            <span className={`badge badge-${video.sensitivity} sensitivity-badge`}>
              {video.sensitivity.toUpperCase()}
            </span>
            {video.sensitivityDetails?.score !== undefined && (
              <div className="sensitivity-score">
                <span className="score-label">Risk Score</span>
                <span className="score-value">{sensitivityLabel(video.sensitivityDetails.score)}</span>
              </div>
            )}
            {video.sensitivityDetails?.categories?.length > 0 && (
              <div className="sensitivity-cats">
                <span className="score-label">Detected Categories</span>
                <div className="cats-list">
                  {video.sensitivityDetails.categories.map(c => (
                    <span key={c} className="cat-tag">{c.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
            {video.sensitivityDetails?.processedAt && (
              <p className="sensitivity-time">
                Analysed {formatDate(video.sensitivityDetails.processedAt)}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="card meta-card">
            <h3 className="meta-title">Video Info</h3>
            <div className="meta-list">
              <MetaRow icon={Film} label="Status">
                <span className={`badge badge-${video.status}`}>{video.status}</span>
              </MetaRow>
              <MetaRow icon={HardDrive} label="File Size">
                {formatFileSize(video.size)}
              </MetaRow>
              {video.duration && (
                <MetaRow icon={Play} label="Duration">
                  {formatDuration(video.duration)}
                </MetaRow>
              )}
              {video.resolution?.width && (
                <MetaRow icon={Maximize} label="Resolution">
                  {video.resolution.width}×{video.resolution.height}
                </MetaRow>
              )}
              <MetaRow icon={Eye} label="Views">{video.viewCount || 0}</MetaRow>
              <MetaRow icon={Calendar} label="Uploaded">
                {formatDate(video.createdAt)}
              </MetaRow>
              {video.uploadedBy && (
                <MetaRow icon={null} label="By">
                  {video.uploadedBy.name}
                </MetaRow>
              )}
            </div>

            {video.tags?.length > 0 && (
              <div className="tags-section">
                <span className="meta-row-label">Tags</span>
                <div className="tags-list">
                  {video.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
            )}
            {video.category && video.category !== 'Uncategorised' && (
              <div className="tags-section" style={{ marginTop: 10 }}>
                <span className="meta-row-label">Category</span>
                <span className="cat-tag">{video.category}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetaRow = ({ icon: Icon, label, children }) => (
  <div className="meta-row">
    <span className="meta-row-label">
      {Icon && <Icon size={13} />} {label}
    </span>
    <span className="meta-row-value">{children}</span>
  </div>
);

/* ── Native HTML5 video player ───────────────────────────────── */
const VideoPlayer = ({ src }) => {
  const videoRef = useRef(null);
  const [playing, setPlaying]   = useState(false);
  const [muted, setMuted]       = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Ensure video loads when src changes
  useEffect(() => {
    const v = videoRef.current;
    if (v && src !== v.src) {
      v.src = src;
      console.log('Video src updated:', src);
    }
  }, [src]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) {
      console.error('Video element not found');
      return;
    }
    
    // Check if video has a valid source
    if (!v.src) {
      console.error('Video source is empty or invalid:', v.src);
      return;
    }
    
    try {
      playing ? v.pause() : v.play();
      setPlaying(!playing);
    } catch (error) {
      console.error('Video play/pause error:', error);
    }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const onSeek = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  const toggleMute = () => {
    const v = videoRef.current;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFS = () => {
    const wrap = videoRef.current?.parentElement;
    if (!document.fullscreenElement) { wrap?.requestFullscreen(); setFullscreen(true); }
    else { document.exitFullscreen(); setFullscreen(false); }
  };

  return (
    <div className="native-player">
      <video
        ref={videoRef}
        src={src}
        className="player-video"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
        onClick={toggle}
        preload="metadata"
      />
      <div className="player-controls">
        <button className="ctrl-btn" onClick={toggle}>
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="seek-bar" onClick={onSeek}>
          <div className="seek-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="time-label">{formatDuration(duration * progress / 100)} / {formatDuration(duration)}</span>
        <button className="ctrl-btn" onClick={toggleMute}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button className="ctrl-btn" onClick={toggleFS}>
          <Maximize size={16} />
        </button>
      </div>
    </div>
  );
};

export default VideoPage;
