import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Shield,
  Layers,
  CheckCircle,
  Server,
  ArrowRight,
} from 'lucide-react';

import ServerConfigModal from './ServerConfigModal';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('USER');
  const [submitting, setSubmitting] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);

  const { login, register } = useAuth();

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', class: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, text: 'Weak', class: 'weak' };
    if (score <= 3) return { score: 2, text: 'Medium', class: 'medium' };
    return { score: 3, text: 'Strong', class: 'strong' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      await login(email, password);
    } else {
      await register(username, email, password, role);
    }
    setSubmitting(false);
  };

  return (
    <div className="auth-wrapper">
      {/* Background Decorative Gradients */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      <div className="auth-container">
        <div className="auth-brand-header">
          <div className="brand-logo-large">
            <Layers size={28} />
          </div>
          <h1 className="auth-title">TaskFlow Management</h1>
          <p className="auth-subtitle">
            Organize your Projects, Tasks, and Comments with the Spring Boot API
          </p>
        </div>

        <div className="auth-card glass-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              <UserPlus size={15} />
              <span>Create Account</span>
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="username">
                  Username
                </label>
                <div className="input-icon-wrapper">
                  <User className="input-icon" size={17} />
                  <input
                    id="username"
                    type="text"
                    className="form-input with-icon"
                    placeholder="e.g. johndoe"
                    minLength={2}
                    maxLength={16}
                    required={!isLogin}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <span className="text-xs text-muted">Between 2 and 16 characters</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <div className="input-icon-wrapper">
                <Mail className="input-icon" size={17} />
                <input
                  id="email"
                  type="email"
                  className="form-input with-icon"
                  placeholder="user@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className="input-icon-wrapper">
                <Lock className="input-icon" size={17} />
                <input
                  id="password"
                  type="password"
                  className="form-input with-icon"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {!isLogin && password && (
                <div>
                  <div className="password-strength-bar">
                    <div
                      className={`password-strength-segment ${passwordStrength.score >= 1 ? `filled ${passwordStrength.class}` : ''
                        }`}
                    />
                    <div
                      className={`password-strength-segment ${passwordStrength.score >= 2 ? `filled ${passwordStrength.class}` : ''
                        }`}
                    />
                    <div
                      className={`password-strength-segment ${passwordStrength.score >= 3 ? `filled ${passwordStrength.class}` : ''
                        }`}
                    />
                  </div>
                  <div className={`password-strength-text ${passwordStrength.class}`}>
                    Strength: {passwordStrength.text}
                  </div>
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="form-group">
                <label className="form-label">User Role</label>
                <div className="role-selector-grid">
                  <button
                    type="button"
                    className={`role-option-card ${role === 'USER' ? 'selected' : ''}`}
                    onClick={() => setRole('USER')}
                  >
                    <User size={18} className="text-primary" />
                    <div className="text-left">
                      <div className="font-semibold text-sm">USER</div>
                      <div className="text-xs text-muted">Standard</div>
                    </div>
                    {role === 'USER' && <CheckCircle size={16} className="role-check" />}
                  </button>

                  <button
                    type="button"
                    className={`role-option-card ${role === 'ADMIN' ? 'selected' : ''}`}
                    onClick={() => setRole('ADMIN')}
                  >
                    <Shield size={18} className="text-primary" />
                    <div className="text-left">
                      <div className="font-semibold text-sm">ADMIN</div>
                      <div className="text-xs text-muted">Administrator</div>
                    </div>
                    {role === 'ADMIN' && <CheckCircle size={16} className="role-check" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg mt-3"
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner-sm"></span>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In to TaskFlow' : 'Create Account'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <button
              type="button"
              className="text-btn text-xs text-muted flex items-center gap-1.5 mx-auto"
              onClick={() => setServerModalOpen(true)}
            >
              <Server size={14} />
              <span>Configure Backend Server URL</span>
            </button>
          </div>
        </div>

        <div className="auth-features">
          <div className="feature-item">
            <span className="feature-dot"></span>
            <span>Project Management</span>
          </div>
          <div className="feature-item">
            <span className="feature-dot"></span>
            <span>Interactive Kanban Boards</span>
          </div>
          <div className="feature-item">
            <span className="feature-dot"></span>
            <span>Real-time Discussion & Comments</span>
          </div>
        </div>
      </div>

      <ServerConfigModal isOpen={serverModalOpen} onClose={() => setServerModalOpen(false)} />
    </div>
  );
}
