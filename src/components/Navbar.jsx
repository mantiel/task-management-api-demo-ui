import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  LogOut,
  User,
  Shield,
  Server,
  Search,
  Menu,
} from 'lucide-react';
import ServerConfigModal from './ServerConfigModal';

export default function Navbar({ onOpenCommandPalette, onOpenProfile, onOpenServerConfig, onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [internalConfigOpen, setInternalConfigOpen] = useState(false);

  const handleOpenConfig = () => {
    if (onOpenServerConfig) {
      onOpenServerConfig();
    } else {
      setInternalConfigOpen(true);
    }
  };

  return (
    <>
      <header className="navbar-container">
        <div className="navbar-left">
          {onToggleSidebar && (
            <button
              type="button"
              className="icon-btn sidebar-toggle-btn"
              onClick={onToggleSidebar}
              title="Toggle Sidebar"
              aria-label="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
          )}
          <div className="navbar-brand">
            <div className="brand-icon-wrapper">
              <CheckSquare className="brand-icon" size={20} />
            </div>
            <div className="brand-text">
              <span className="brand-name">TaskFlow</span>
              <span className="brand-tag">Spring Boot API</span>
            </div>
          </div>
        </div>

        {/* Global Quick Search (Command Palette trigger) */}
        <div className="navbar-center hide-mobile">
          <button
            type="button"
            className="cmd-k-trigger"
            onClick={onOpenCommandPalette}
            title="Search projects and quick actions (Ctrl+K)"
          >
            <Search size={14} />
            <span>Search or run command...</span>
            <kbd>Ctrl+K</kbd>
          </button>
        </div>

        <div className="navbar-right">
          {/* Backend Status / Config */}
          <button
            type="button"
            className="btn btn-outline btn-sm server-status-btn"
            onClick={handleOpenConfig}
            title="Configure backend connection"
          >
            <Server size={14} />
            <span className="server-dot online"></span>
            <span className="hide-mobile">Backend</span>
          </button>

          {/* User Profile Badge */}
          {user && (
            <div
              className="user-profile-badge"
              onClick={onOpenProfile}
              title="View my profile"
            >
              <div className="avatar-circle">
                {user.username ? user.username.charAt(0).toUpperCase() : <User size={15} />}
              </div>
              <div className="user-info hide-mobile">
                <span className="user-name">{user.username}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <span className={`role-badge ${user.role === 'ADMIN' ? 'role-admin' : 'role-user'}`}>
                {user.role === 'ADMIN' ? <Shield size={10} /> : null}
                {user.role || 'USER'}
              </span>

              <button
                type="button"
                className="btn btn-ghost btn-sm logout-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
                title="Log out"
              >
                <LogOut size={15} />
                <span className="hide-mobile">Log Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {!onOpenServerConfig && (
        <ServerConfigModal
          isOpen={internalConfigOpen}
          onClose={() => setInternalConfigOpen(false)}
        />
      )}
    </>
  );
}
