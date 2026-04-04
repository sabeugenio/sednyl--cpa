import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { User, Lock, Eye, EyeOff, X, Loader2 } from 'lucide-react';

export default function EditProfileModal({ user, onClose, onUpdate }) {
  // Name State
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setNameError('');
    setNameSuccess('');

    if (!fullName.trim()) {
      setNameError('Please enter your full name');
      return;
    }

    setNameLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      });
      if (error) throw error;
      
      if (onUpdate && data?.user) {
        onUpdate(data.user);
      }
      
      setNameSuccess('Profile name updated successfully!');
    } catch (err) {
      setNameError(err.message);
    } finally {
      setNameLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword) {
      setPwdError('Please enter your current password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters');
      return;
    }

    setPwdLoading(true);

    try {
      // Validate current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        setPwdError('Incorrect current password');
        setPwdLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (updateError) throw updateError;
      
      setPwdSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="auth-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '550px', width: '90%', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left' }}
      >
        <div className="auth-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="auth-title" style={{ fontSize: '1.25rem', marginBottom: 0 }}>Edit Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* --- Profile Name Section --- */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>Personal Information</h3>
          
          {nameError && (
            <div className="auth-message auth-error" style={{ marginBottom: '1rem' }}>
              {nameError}
            </div>
          )}
          
          {nameSuccess && (
            <div className="auth-message auth-success" style={{ marginBottom: '1rem' }}>
              {nameSuccess}
            </div>
          )}

          <form onSubmit={handleUpdateName} className="auth-form">
            <div className="auth-field">
              <label className="auth-label" htmlFor="edit-name">Full Name</label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-input-icon" />
                <input
                  id="edit-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={nameLoading} style={{ marginTop: '0.5rem' }}>
              {nameLoading ? (
                <><Loader2 size={16} className="auth-spinner" /> Updating...</>
              ) : (
                'Update Name'
              )}
            </button>
          </form>
        </div>

        {/* --- Password Section --- */}
        <div>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>Security</h3>

          {pwdError && (
            <div className="auth-message auth-error" style={{ marginBottom: '1rem' }}>
              {pwdError}
            </div>
          )}
          
          {pwdSuccess && (
            <div className="auth-message auth-success" style={{ marginBottom: '1rem' }}>
              {pwdSuccess}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="auth-form">
            <div className="auth-field">
              <label className="auth-label" htmlFor="edit-current-password">Current Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="edit-current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  autoComplete="current-password"
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="edit-new-password">New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="edit-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="auth-input"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="edit-confirm-password">Confirm New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="edit-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="auth-input"
                />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={pwdLoading} style={{ marginTop: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}>
              {pwdLoading ? (
                <><Loader2 size={16} className="auth-spinner" /> Updating...</>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
