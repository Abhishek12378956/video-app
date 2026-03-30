import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Film, CheckCircle, AlertTriangle, Clock, TrendingUp,
  ArrowRight, Play, Loader, Upload
} from 'lucide-react';
import { videoAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../context/ToastContext';
import { formatFileSize, formatDuration, timeAgo } from '../utils/format';
import './DashboardPage.css';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: `${color}20`, color }}>
      <Icon size={22} />
    </div>
    <div className="stat-info">
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  </div>
);

const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const { on } = useSocket();

  const [videos, setVideos]     = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [liveEvents, setLiveEvents] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [vidRes, statsRes] = await Promise.all([
        videoAPI.getVideos({ limit: 6, sortBy: 'createdAt', sortOrder: 'desc' }),
        isAdmin ? videoAPI.getStats() : Promise.resolve(null),
      ]);
      setVideos(vidRes.videos);
      if (statsRes) setStats(statsRes.stats);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time socket events
  useEffect(() => {
    const offProgress = on('video:progress', ({ videoId, progress, message }) => {
      setVideos(prev => prev.map(v =>
        v._id === videoId ? { ...v, processingProgress: progress } : v
      ));
    });

    const offStatus = on('video:statusChange', ({ videoId, status, sensitivity }) => {
      setVideos(prev => prev.map(v =>
        v._id === videoId ? { ...v, status, sensitivity } : v
      ));
    });

    const offComplete = on('video:complete', (data) => {
      const event = { id: Date.now(), ...data, time: new Date() };
      setLiveEvents(prev => [event, ...prev].slice(0, 5));
      toast.success(`"${data.title}" processed — ${data.sensitivity}`);
      fetchData();
    });

    const offError = on('video:error', ({ videoId, error }) => {
      toast.error(`Processing failed: ${error}`);
      fetchData();
    });

    return () => { offProgress?.(); offStatus?.(); offComplete?.(); offError?.(); };
  }, [on, fetchData]);

  // Derived stats from videos list
  const localStats = {
    total:      videos.length,
    safe:       videos.filter(v => v.sensitivity === 'safe').length,
    flagged:    videos.filter(v => v.sensitivity === 'flagged').length,
    processing: videos.filter(v => v.status === 'processing').length,
  };

  const displayStats = isAdmin && stats ? {
    total:      stats.total,
    safe:       stats.bySensitivity?.safe || 0,
    flagged:    stats.bySensitivity?.flagged || 0,
    processing: stats.byStatus?.processing || 0,
  } : localStats;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="dashboard fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {getTimeOfDay()},{' '}
            <span style={{ color: 'var(--accent-light)' }}>{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="page-subtitle">Here's what's happening with your videos</p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          <Upload size={16} /> Upload Video
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={Film}          label="Total Videos"  value={displayStats.total}      color="var(--accent-light)" />
        <StatCard icon={CheckCircle}   label="Safe"          value={displayStats.safe}        color="var(--safe)"         />
        <StatCard icon={AlertTriangle} label="Flagged"       value={displayStats.flagged}     color="var(--flagged)"      />
        <StatCard icon={Loader}        label="Processing"    value={displayStats.processing}  color="var(--pending)"      sub="live" />
      </div>

      <div className="dashboard-grid">
        {/* Recent Videos */}
        <div className="card dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Recent Videos</h2>
            <Link to="/library" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="video-list">
            {videos.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="empty-state-icon"><Film size={28} /></div>
                <p>No videos yet</p>
                <Link to="/upload" className="btn btn-primary btn-sm">Upload your first video</Link>
              </div>
            ) : videos.map(video => (
              <VideoListItem key={video._id} video={video} />
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="card dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Live Activity</h2>
            <div className="live-indicator">
              <div className="live-dot" />
              <span>LIVE</span>
            </div>
          </div>

          {liveEvents.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon"><TrendingUp size={28} /></div>
              <p style={{ fontSize: '0.875rem' }}>Processing events will appear here</p>
            </div>
          ) : (
            <div className="activity-feed">
              {liveEvents.map(event => (
                <div key={event.id} className="activity-item fade-in">
                  <div className={`activity-dot activity-dot-${event.sensitivity}`} />
                  <div className="activity-info">
                    <span className="activity-title">{event.title}</span>
                    <span className="activity-meta">
                      {event.sensitivity === 'safe' ? '✓ Safe content' : '⚠ Flagged content'}
                      {' · '}{timeAgo(event.time)}
                    </span>
                  </div>
                  <span className={`badge badge-${event.sensitivity}`}>{event.sensitivity}</span>
                </div>
              ))}
            </div>
          )}

          {/* Processing videos */}
          {videos.filter(v => v.status === 'processing').map(video => (
            <div key={video._id} className="processing-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {video.title}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--accent-light)' }}>
                  {video.processingProgress || 0}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${video.processingProgress || 0}%` }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Processing…
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const VideoListItem = ({ video }) => (
  <Link to={`/videos/${video._id}`} className="video-list-item">
    <div className="video-thumb">
      <Play size={16} />
    </div>
    <div className="video-list-info">
      <span className="video-list-title">{video.title}</span>
      <span className="video-list-meta">
        {formatFileSize(video.size)}
        {video.duration ? ` · ${formatDuration(video.duration)}` : ''}
        {' · '}{timeAgo(video.createdAt)}
      </span>
    </div>
    <span className={`badge badge-${video.sensitivity === 'pending' ? 'pending' : video.sensitivity}`}>
      {video.sensitivity}
    </span>
  </Link>
);

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default DashboardPage;
