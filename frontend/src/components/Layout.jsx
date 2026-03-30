import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Library, Upload, Shield, User, LogOut,
  Menu, X, Zap, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Layout.css';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/library',   icon: Library,         label: 'Library' },
  { to: '/upload',    icon: Upload,           label: 'Upload', editorOnly: true },
  { to: '/admin',     icon: Shield,           label: 'Admin',  adminOnly: true },
  { to: '/profile',   icon: User,             label: 'Profile' },
];

const Layout = () => {
  const { user, logout, isAdmin, isEditor } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const visibleNav = navItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.editorOnly && !isEditor) return false;
    return true;
  });

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="logo-text">VideoVault</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className={`badge badge-${user?.role}`}>{user?.role}</span>
          </div>
        </div>

        <div className="divider" style={{ margin: '0 16px' }} />

        {/* Navigation */}
        <nav className="sidebar-nav">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>

        {/* Org badge */}
        <div className="sidebar-footer">
          <div className="org-tag">
            <span className="org-label">Organisation</span>
            <span className="org-name">{user?.organisation}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrapper">
        {/* Mobile topbar */}
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="topbar-logo">
            <Zap size={16} fill="currentColor" color="var(--accent)" />
            <span>VideoVault</span>
          </div>
          <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
