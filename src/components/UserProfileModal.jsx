import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userApi } from '../api/client';
import { User, Mail, Shield, Edit2, X, Key } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose }) {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setIsEditing(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast('Username cannot be empty', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await userApi.updateMe(username.trim());
      await refreshUser();
      showToast('Username updated successfully!', 'success');
      setIsEditing(false);
    } catch (err) {
      showToast(err.message || 'Error updating profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <User size={20} className="text-primary" />
            <h3 className="modal-title">My Profile</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body text-center">
          <div className="profile-avatar-large">
            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdate} className="text-left mt-3">
              <div className="form-group">
                <label className="form-label" htmlFor="edit-username">
                  Username
                </label>
                <input
                  id="edit-username"
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={2}
                  maxLength={16}
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{user.username}</h2>
                <button
                  type="button"
                  className="icon-btn-xs"
                  onClick={() => setIsEditing(true)}
                  title="Edit username"
                >
                  <Edit2 size={13} />
                </button>
              </div>
              <p className="text-xs text-muted mb-4">{user.email}</p>

              <div className="text-left bg-surface p-3 rounded-lg border border-color mb-3">
                <div className="profile-info-row">
                  <span className="profile-info-label flex items-center gap-2">
                    <Mail size={14} /> Email:
                  </span>
                  <span className="profile-info-value">{user.email}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-label flex items-center gap-2">
                    <Shield size={14} /> Role:
                  </span>
                  <span className={`role-badge ${user.role === 'ADMIN' ? 'role-admin' : 'role-user'}`}>
                    {user.role || 'USER'}
                  </span>
                </div>
                <div className="profile-info-row" style={{ borderBottom: 'none' }}>
                  <span className="profile-info-label flex items-center gap-2">
                    <Key size={14} /> User ID:
                  </span>
                  <span className="profile-info-value font-mono">#{user.id}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          {!isEditing && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 size={14} />
              <span>Edit Username</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
