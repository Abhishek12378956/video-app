import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './AuthPages.css';

const RegisterPage = () => {
  const [form, setForm]   = useState({ name: '', email: '', password: '', confirmPassword: '', organisation: '' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast        = useToast();
  const navigate     = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validateForm = () => {
    const errors = [];
    
    // Name validation
    if (!form.name) {
      errors.push('Name is required');
    } else if (form.name.length < 2) {
      errors.push('Name must be at least 2 characters');
    } else if (!/^[a-zA-Z\s]+$/.test(form.name)) {
      errors.push('Name can only contain letters and spaces');
    }
    
    // Organisation validation
    if (!form.organisation) {
      errors.push('Organisation is required');
    } else if (form.organisation.length < 2) {
      errors.push('Organisation name must be at least 2 characters');
    }
    
    // Email validation
    if (!form.email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.push('Please enter a valid email address');
    }
    
    // Password validation
    if (!form.password) {
      errors.push('Password is required');
    } else if (form.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    } else if (!/(?=.*[a-z])/.test(form.password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (!/(?=.*[A-Z])/.test(form.password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (!/(?=.*\d)/.test(form.password)) {
      errors.push('Password must contain at least one number');
    }
    
    // Confirm password validation
    if (!form.confirmPassword) {
      errors.push('Please confirm your password');
    } else if (form.password !== form.confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(errors[0]); // Show first error
      return;
    }
    
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow" />
        <div className="auth-grid" />
      </div>

      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="logo-icon"><Zap size={22} fill="currentColor" /></div>
          <span className="logo-text">VideoVault</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start managing your videos today</p>

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
          <div className="auth-name-row">
            <div className="input-group">
              <label className="input-label">Full name</label>
              <input className="input" type="text" name="name" value={form.name}
                onChange={handleChange} placeholder="Jane Smith" autoFocus autoComplete="name" />
            </div>
            <div className="input-group">
              <label className="input-label">Organisation</label>
              <input className="input" type="text" name="organisation" value={form.organisation}
                onChange={handleChange} placeholder="Acme Inc." autoComplete="organization" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email address</label>
            <input className="input" type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="jane@example.com" autoComplete="email" />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-with-icon">
              <input className="input" type={showPass ? 'text' : 'password'} name="password" value={form.password}
                onChange={handleChange} placeholder="Min. 6 chars, 1 uppercase, 1 lowercase, 1 number" autoComplete="new-password" />
              <button type="button" className="input-icon-btn" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <div className="input-with-icon">
              <input className="input" type={showConfirmPass ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword}
                onChange={handleChange} placeholder="Re-enter your password" autoComplete="new-password" />
              <button type="button" className="input-icon-btn" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <div className="spinner" /> : <UserPlus size={16} />}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
