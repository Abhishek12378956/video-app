import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Trash2, Edit3, Shield, Eye, Film,
  Search, CheckCircle, XCircle, Save, X, BarChart3
} from 'lucide-react';
import { userAPI, videoAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatDate, timeAgo } from '../utils/format';
import './AdminPage.css';

const ROLES = ['viewer','editor','admin'];

const AdminPage = () => {
  const toast = useToast();
  const [tab, setTab]         = useState('users');
  const [users, setUsers]     = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editUser, setEditUser]       = useState(null);
  const [deleting, setDeleting]       = useState(null);
  const [saving, setSaving]           = useState(false);

  const [createForm, setCreateForm] = useState({
    name:'', email:'', password:'', role:'editor', organisation:'Default',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)     params.search = search;
      if (roleFilter) params.role   = roleFilter;
      const [uRes, sRes] = await Promise.all([
        userAPI.getUsers(params),
        videoAPI.getStats(),
      ]);
      setUsers(uRes.data.users);
      setStats(sRes.data.stats);
    } catch { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(), 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Name, email and password required'); return;
    }
    setSaving(true);
    try {
      const res = await userAPI.createUser(createForm);
      setUsers(prev => [res.data.user, ...prev]);
      setCreateModal(false);
      setCreateForm({ name:'', email:'', password:'', role:'editor', organisation:'Default' });
      toast.success('User created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed');
    } finally { setSaving(false); }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await userAPI.updateUser(editUser._id, {
        name: editUser.name, role: editUser.role,
        organisation: editUser.organisation, isActive: editUser.isActive,
      });
      setUsers(prev => prev.map(u => u._id === editUser._id ? res.data.user : u));
      setEditUser(null);
      toast.success('User updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    setDeleting(user._id);
    try {
      await userAPI.deleteUser(user._id);
      setUsers(prev => prev.filter(u => u._id !== user._id));
      toast.success('User deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setDeleting(null); }
  };

  const toggleActive = async (user) => {
    try {
      const res = await userAPI.updateUser(user._id, { isActive: !user.isActive });
      setUsers(prev => prev.map(u => u._id === user._id ? res.data.user : u));
      toast.success(`User ${res.data.user.isActive ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Update failed'); }
  };

  return (
    <div className="admin-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage users, roles, and monitor system stats</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {[{id:'users',icon:Users,label:'Users'},{id:'stats',icon:BarChart3,label:'System Stats'}].map(t => (
          <button key={t.id} className={`admin-tab ${tab===t.id?'admin-tab-active':''}`} onClick={() => setTab(t.id)}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          {/* Toolbar */}
          <div className="card admin-toolbar">
            <div className="search-wrap" style={{ flex:1 }}>
              <Search size={15} className="search-icon" />
              <input className="input search-input" placeholder="Search users…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input filter-select" value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)} style={{ maxWidth:140 }}>
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => setCreateModal(true)}>
              <UserPlus size={14} /> New User
            </button>
          </div>

          {/* User table */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {loading ? (
              <div style={{ padding:40, display:'flex', justifyContent:'center' }}>
                <div className="spinner" style={{width:28,height:28,borderWidth:3}} />
              </div>
            ) : (
              <div className="user-table-wrap">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>User</th><th>Role</th><th>Organisation</th>
                      <th>Status</th><th>Joined</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user._id} className={!user.isActive ? 'row-inactive' : ''}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar" style={{width:32,height:32,fontSize:'0.75rem'}}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="user-cell-name">{user.name}</div>
                              <div className="user-cell-email">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className={`badge badge-${user.role}`}>{user.role}</span></td>
                        <td><span className="org-pill">{user.organisation}</span></td>
                        <td>
                          <span className={`badge ${user.isActive ? 'badge-safe' : 'badge-failed'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="muted-cell">{formatDate(user.createdAt)}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => setEditUser({...user})} title="Edit">
                              <Edit3 size={13} />
                            </button>
                            <button
                              className={`btn btn-icon btn-sm ${user.isActive ? 'btn-secondary' : 'btn-ghost'}`}
                              onClick={() => toggleActive(user)}
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {user.isActive ? <XCircle size={13} /> : <CheckCircle size={13} />}
                            </button>
                            <button className="btn btn-danger btn-icon btn-sm"
                              onClick={() => handleDelete(user)} disabled={deleting===user._id} title="Delete">
                              {deleting===user._id
                                ? <div className="spinner" style={{width:12,height:12}} />
                                : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="empty-state" style={{padding:'40px 0'}}>
                    <div className="empty-state-icon"><Users size={28}/></div>
                    <p>No users found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'stats' && stats && (
        <div className="stats-section">
          <div className="stats-grid">
            {[
              { label:'Total Videos', value:stats.total, icon:Film, color:'var(--accent-light)' },
              { label:'Safe Videos',  value:stats.bySensitivity?.safe||0,    icon:CheckCircle, color:'var(--safe)' },
              { label:'Flagged',      value:stats.bySensitivity?.flagged||0, icon:Shield,      color:'var(--flagged)' },
              { label:'Processing',   value:stats.byStatus?.processing||0,   icon:Eye,         color:'var(--pending)' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{background:`${s.color}20`,color:s.color}}>
                  <s.icon size={22} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{s.value}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              </div>
            ))}
          </div>

          {stats.recentUploads?.length > 0 && (
            <div className="card">
              <h3 style={{ fontFamily:'var(--font-display)', color:'var(--text-primary)', marginBottom:16 }}>
                Recent Uploads
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {stats.recentUploads.map(v => (
                  <div key={v._id} className="video-list-item">
                    <div className="video-thumb"><Film size={14} /></div>
                    <div className="video-list-info">
                      <span className="video-list-title">{v.title}</span>
                      <span className="video-list-meta">by {v.uploadedBy?.name} · {timeAgo(v.createdAt)}</span>
                    </div>
                    <span className={`badge badge-${v.sensitivity}`}>{v.sensitivity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      {createModal && (
        <Modal title="Create User" onClose={() => setCreateModal(false)}>
          <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:16}}>
            {[
              {name:'name',label:'Full Name',type:'text',placeholder:'Jane Smith'},
              {name:'email',label:'Email',type:'email',placeholder:'jane@example.com'},
              {name:'password',label:'Password',type:'password',placeholder:'Min 6 chars'},
              {name:'organisation',label:'Organisation',type:'text',placeholder:'Acme Inc.'},
            ].map(f => (
              <div key={f.name} className="input-group">
                <label className="input-label">{f.label}</label>
                <input className="input" type={f.type} placeholder={f.placeholder}
                  value={createForm[f.name]}
                  onChange={e => setCreateForm(p => ({...p,[f.name]:e.target.value}))} />
              </div>
            ))}
            <div className="input-group">
              <label className="input-label">Role</label>
              <select className="input" value={createForm.role}
                onChange={e => setCreateForm(p => ({...p,role:e.target.value}))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:4}}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCreateModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? <div className="spinner" style={{width:14,height:14}} /> : <UserPlus size={14} />}
                Create User
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="input-group">
              <label className="input-label">Name</label>
              <input className="input" value={editUser.name}
                onChange={e => setEditUser(u => ({...u,name:e.target.value}))} />
            </div>
            <div className="input-group">
              <label className="input-label">Organisation</label>
              <input className="input" value={editUser.organisation}
                onChange={e => setEditUser(u => ({...u,organisation:e.target.value}))} />
            </div>
            <div className="input-group">
              <label className="input-label">Role</label>
              <select className="input" value={editUser.role}
                onChange={e => setEditUser(u => ({...u,role:e.target.value}))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:4}}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditUser(null)}>
                <X size={14} /> Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleEditSave} disabled={saving}>
                {saving ? <div className="spinner" style={{width:14,height:14}} /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div className="modal-backdrop" onClick={(e) => e.target===e.currentTarget && onClose()}>
    <div className="modal-box fade-in">
      <div className="modal-header">
        <h3 className="modal-title">{title}</h3>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
);

export default AdminPage;
