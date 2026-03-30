import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Upload, Play, Trash2, Edit3,
  Film, AlertTriangle, CheckCircle, Clock, RefreshCw
} from 'lucide-react';
import { videoAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import { formatFileSize, formatDuration, timeAgo } from '../utils/format';
import './LibraryPage.css';

const STATUS_OPTIONS     = [{ v:'', l:'All Status' },{ v:'completed', l:'Completed' },{ v:'processing', l:'Processing' },{ v:'failed', l:'Failed' }];
const SENSITIVITY_OPTIONS= [{ v:'', l:'All Content' },{ v:'safe', l:'Safe' },{ v:'flagged', l:'Flagged' },{ v:'pending', l:'Pending' }];
const SORT_OPTIONS       = [{ v:'createdAt', l:'Upload Date' },{ v:'title', l:'Title' },{ v:'size', l:'File Size' },{ v:'viewCount', l:'Views' }];

const LibraryPage = () => {
  const { isEditor } = useAuth();
  const toast = useToast();
  const { on } = useSocket();

  const [videos, setVideos]       = useState([]);
  const [pagination, setPagination] = useState({ total:0, page:1, pages:1 });
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState(null);

  const [filters, setFilters] = useState({
    search: '', status: '', sensitivity: '', sortBy: 'createdAt', sortOrder: 'desc', page: 1,
  });

  const fetchVideos = useCallback(async (f = filters) => {
    setLoading(true);
    try {
      const params = { ...f, limit: 12 };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await videoAPI.getVideos(params);
      setVideos(res.videos);
      setPagination(res.pagination);
    } catch {
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchVideos(); }, [filters.page]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchVideos({ ...filters, page: 1 }), 350);
    return () => clearTimeout(t);
  }, [filters.search, filters.status, filters.sensitivity, filters.sortBy, filters.sortOrder]);

  // Real-time updates
  useEffect(() => {
    const off = on('video:statusChange', ({ videoId, status, sensitivity }) => {
      setVideos(prev => prev.map(v =>
        v._id === videoId ? { ...v, status, sensitivity } : v
      ));
    });
    return () => off?.();
  }, [on]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

  const handleDelete = async (video) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    setDeleting(video._id);
    try {
      await videoAPI.deleteVideo(video._id);
      toast.success('Video deleted');
      setVideos(prev => prev.filter(v => v._id !== video._id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="library-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Video Library</h1>
          <p className="page-subtitle">
            {pagination.total} video{pagination.total !== 1 ? 's' : ''} in your library
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchVideos()}>
            <RefreshCw size={14} />
          </button>
          {isEditor && (
            <Link to="/upload" className="btn btn-primary btn-sm">
              <Upload size={14} /> Upload
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="library-filters card">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            className="input search-input"
            placeholder="Search by title, description or tag…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>
        <div className="filter-row">
          <Filter size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <select className="input filter-select" value={filters.status}
            onChange={e => setFilter('status', e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <select className="input filter-select" value={filters.sensitivity}
            onChange={e => setFilter('sensitivity', e.target.value)}>
            {SENSITIVITY_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <select className="input filter-select" value={filters.sortBy}
            onChange={e => setFilter('sortBy', e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <button
            className={`btn btn-sm ${filters.sortOrder === 'desc' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setFilter('sortOrder', filters.sortOrder === 'desc' ? 'asc' : 'desc')}
            title="Toggle sort order"
          >
            {filters.sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="video-grid">
          {[...Array(6)].map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Film size={32} /></div>
          <h3 style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>No videos found</h3>
          <p>Try adjusting your filters or upload a new video</p>
          {isEditor && <Link to="/upload" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Upload Video</Link>}
        </div>
      ) : (
        <div className="video-grid">
          {videos.map(v => (
            <VideoCard key={v._id} video={v}
              onDelete={isEditor ? () => handleDelete(v) : null}
              deleting={deleting === v._id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm"
            disabled={filters.page <= 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>
            ← Prev
          </button>
          <span className="page-info">Page {filters.page} of {pagination.pages}</span>
          <button className="btn btn-secondary btn-sm"
            disabled={filters.page >= pagination.pages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

const SensitivityIcon = ({ s }) => {
  if (s === 'safe')    return <CheckCircle size={12} />;
  if (s === 'flagged') return <AlertTriangle size={12} />;
  return <Clock size={12} />;
};

const VideoCard = ({ video, onDelete, deleting }) => (
  <div className="video-card">
    {/* Thumbnail */}
    <Link to={`/videos/${video._id}`} className="video-card-thumb">
      <div className="thumb-placeholder">
        <Play size={24} />
      </div>
      <div className={`thumb-overlay status-${video.status}`}>
        {video.status === 'processing' && (
          <div className="thumb-progress">
            <div className="progress-bar" style={{ height: 3 }}>
              <div className="progress-fill" style={{ width: `${video.processingProgress || 0}%` }} />
            </div>
          </div>
        )}
      </div>
      <span className={`thumb-badge badge badge-${video.sensitivity === 'pending' ? 'pending' : video.sensitivity}`}>
        <SensitivityIcon s={video.sensitivity} />
        {video.sensitivity}
      </span>
      {video.duration && (
        <span className="thumb-duration">{formatDuration(video.duration)}</span>
      )}
    </Link>

    {/* Info */}
    <div className="video-card-body">
      <Link to={`/videos/${video._id}`} className="video-card-title" title={video.title}>
        {video.title}
      </Link>
      <div className="video-card-meta">
        <span>{formatFileSize(video.size)}</span>
        <span>·</span>
        <span>{timeAgo(video.createdAt)}</span>
        {video.viewCount > 0 && <><span>·</span><span>{video.viewCount} views</span></>}
      </div>
      {video.category && video.category !== 'Uncategorised' && (
        <span className="video-category">{video.category}</span>
      )}
    </div>

    {/* Actions */}
    {onDelete && (
      <div className="video-card-actions">
        <Link to={`/videos/${video._id}`} className="btn btn-ghost btn-icon btn-sm" title="View">
          <Play size={14} />
        </Link>
        <Link to={`/videos/${video._id}`} className="btn btn-ghost btn-icon btn-sm" title="Edit">
          <Edit3 size={14} />
        </Link>
        <button
          className="btn btn-danger btn-icon btn-sm"
          onClick={onDelete}
          disabled={deleting}
          title="Delete"
        >
          {deleting ? <div className="spinner" style={{ width:12, height:12 }} /> : <Trash2 size={14} />}
        </button>
      </div>
    )}
  </div>
);

const VideoCardSkeleton = () => (
  <div className="video-card">
    <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-md)' }} />
    <div className="video-card-body" style={{ gap: 8 }}>
      <div className="skeleton" style={{ height: 16, width: '75%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: '50%', borderRadius: 4 }} />
    </div>
  </div>
);

export default LibraryPage;
