import React, { useState } from 'react';
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', organisation: user?.organisation || '' });
  const [passForm, setPassForm]       = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass]       = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass]       = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name) { toast.error('Name is required'); return; }
    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile(profileForm);
      updateUser(res.data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSavingProfile(false); }
  };

  const handlePassSave = async (e) => {
    e.preventDefault();
    if (!passForm.currentPassword || !passForm.newPassword) {
      toast.error('All password fields are required'); return;
    }
    if (passForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters'); return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('New passwords do not match'); return;
    }
    setSavingPass(true);
    try {
      await authAPI.changePassword({
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally { setSavingPass(false); }
  };

  const togglePass = (field) => setShowPass(p => ({ ...p, [field]: !p[field] }));

  return (
    <div className="profile-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage your account settings</p>
        </div>
      </div>

      <div className="profile-layout">
        {/* Profile summary card */}
        <div className="card profile-summary">
          <div className="profile-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <h2 className="profile-name">{user?.name}</h2>
          <p className="profile-email">{user?.email}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className={`badge badge-${user?.role}`}>{user?.role}</span>
            <span className="badge badge-viewer" style={{ background: 'var(--electric-dim)', color: 'var(--electric)' }}>
              {user?.organisation}
            </span>
          </div>
          <div className="divider" />
          <div className="profile-meta-list">
            <div className="profile-meta-row">
              <span className="meta-row-label">Member since</span>
              <span className="meta-row-value">{formatDate(user?.createdAt)}</span>
            </div>
            <div className="profile-meta-row">
              <span className="meta-row-label">Role</span>
              <span className="meta-row-value">{user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}</span>
            </div>
          </div>
        </div>

        {/* Forms */}
        <div className="profile-forms">
          {/* Profile info */}
          <div className="card">
            <div className="form-header">
              <div className="form-header-icon"><User size={18} /></div>
              <h3 className="form-title">Personal Information</h3>
            </div>
            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row-2">
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input className="input" type="text" value={profileForm.name}
                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name" />
                </div>
                <div className="input-group">
                  <label className="input-label">Organisation</label>
                  <input className="input" type="text" value={profileForm.organisation}
                    onChange={e => setProfileForm(f => ({ ...f, organisation: e.target.value }))}
                    placeholder="Your organisation" />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input className="input" type="email" value={user?.email} disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Email cannot be changed. Contact your admin for help.
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingProfile}>
                  {savingProfile ? <div className="spinner" style={{ width:14, height:14 }} /> : <Save size={14} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change password */}
          <div className="card">
            <div className="form-header">
              <div className="form-header-icon" style={{ background: 'var(--flagged-dim)', color: 'var(--flagged)' }}>
                <Lock size={18} />
              </div>
              <h3 className="form-title">Change Password</h3>
            </div>
            <form onSubmit={handlePassSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { name: 'currentPassword', label: 'Current Password', placeholder: '••••••••' },
                { name: 'newPassword', label: 'New Password', placeholder: 'Min 6 characters' },
                { name: 'confirmPassword', label: 'Confirm New Password', placeholder: 'Repeat new password' },
              ].map(f => (
                <div key={f.name} className="input-group">
                  <label className="input-label">{f.label}</label>
                  <div className="input-with-icon">
                    <input
                      className="input"
                      type={showPass[f.name] ? 'text' : 'password'}
                      value={passForm[f.name]}
                      onChange={e => setPassForm(p => ({ ...p, [f.name]: e.target.value }))}
                      placeholder={f.placeholder}
                    />
                    <button type="button" className="input-icon-btn" onClick={() => togglePass(f.name)}>
                      {showPass[f.name] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingPass}>
                  {savingPass ? <div className="spinner" style={{ width:14, height:14 }} /> : <Lock size={14} />}
                  Change Password
                </button>
              </div>
            </form>
          </div>

          {/* Role info */}
          <div className="card role-info-card">
            <h3 className="form-title" style={{ marginBottom: 12 }}>Your Permissions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Watch Videos',   allowed: true },
                { label: 'Upload Videos',  allowed: user?.role !== 'viewer' },
                { label: 'Edit Videos',    allowed: user?.role !== 'viewer' },
                { label: 'Delete Videos',  allowed: user?.role !== 'viewer' },
                { label: 'Admin Panel',    allowed: user?.role === 'admin' },
                { label: 'Manage Users',   allowed: user?.role === 'admin' },
              ].map(p => (
                <div key={p.label} className="perm-row">
                  <span style={{ color: p.allowed ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {p.label}
                  </span>
                  <span style={{ color: p.allowed ? 'var(--safe)' : 'var(--text-muted)', fontSize: '0.8125rem', display:'flex', alignItems:'center', gap:4 }}>
                    {p.allowed ? '✓ Allowed' : '✗ Restricted'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
