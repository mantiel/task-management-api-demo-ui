import React, { useState } from 'react';
import { getBaseUrl, setBaseUrl, authApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Server, Check, X, RefreshCw } from 'lucide-react';

export default function ServerConfigModal({ isOpen, onClose }) {
  const [url, setUrl] = useState(getBaseUrl());
  const [testing, setTesting] = useState(false);
  const [pingStatus, setPingStatus] = useState(null);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSave = () => {
    setBaseUrl(url.trim());
    showToast('Backend URL configuration saved', 'success');
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setPingStatus(null);
    try {
      // Temporarily set to test
      const prev = getBaseUrl();
      setBaseUrl(url.trim());
      const res = await authApi.ping();
      setPingStatus({ ok: true, msg: `Connection successful! (${res})` });
      showToast('Connected to Spring Boot backend successfully', 'success');
    } catch (err) {
      setPingStatus({ ok: false, msg: `Connection error: ${err.message}` });
      showToast('Could not communicate with backend', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Server size={20} className="text-primary" />
            <h3 className="modal-title">Configure Backend Server</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="text-muted text-sm mb-4">
            By default, the frontend uses Vite's proxy pointing to <code>http://localhost:8080</code>.
            If your backend runs on a different port or host, specify it here:
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="server-url">Backend Base URL (optional)</label>
            <input
              id="server-url"
              type="text"
              className="form-input"
              placeholder="e.g. http://localhost:8080 (or leave blank to use proxy)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <span className="text-xs text-muted mt-1 block">
              Leaving blank will use the relative <code>/api</code> and <code>/auth</code> routes proxied by Vite.
            </span>
          </div>

          {pingStatus && (
            <div className={`status-banner ${pingStatus.ok ? 'success' : 'error'} mt-3`}>
              {pingStatus.ok ? <Check size={16} /> : <X size={16} />}
              <span>{pingStatus.msg}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTest}
            disabled={testing}
          >
            <RefreshCw size={16} className={testing ? 'animate-spin' : ''} />
            {testing ? 'Testing...' : 'Test Connection (Ping)'}
          </button>

          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
