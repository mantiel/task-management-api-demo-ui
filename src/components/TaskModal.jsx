import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { projectApi, userApi } from '../api/client';
import {
  CheckSquare,
  Calendar,
  User,
  X,
} from 'lucide-react';

export default function TaskModal({ isOpen, onClose, onSuccess, projectId, users = [] }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [userAssigneeId, setUserAssigneeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [availableUsers, setAvailableUsers] = useState(users);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setPriority('MEDIUM');
      setDueDate('');
      setUserAssigneeId(user?.id || '');

      // Load users list if not provided
      if (users.length === 0) {
        userApi
          .getAllUsers(0, 50)
          .then((res) => {
            if (res && res.content) {
              setAvailableUsers(res.content);
            } else if (Array.isArray(res)) {
              setAvailableUsers(res);
            }
          })
          .catch((err) => console.warn('Could not load users for assignment:', err));
      } else {
        setAvailableUsers(users);
      }
    }
  }, [isOpen, user, users]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Task title is required', 'warning');
      return;
    }

    const assigneeId = Number(userAssigneeId) || user?.id || 1;

    setSubmitting(true);
    try {
      const taskPayload = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
        completedAt: status === 'DONE' ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        userAssigneeId: assigneeId,
      };

      await projectApi.createTask(projectId, taskPayload);
      showToast('Task created successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Error creating task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <CheckSquare size={20} className="text-primary" />
            <h3 className="modal-title">New Task</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="task-title">
                Task Title *
              </label>
              <input
                id="task-title"
                type="text"
                className="form-input"
                placeholder="e.g. Implement JWT authentication"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-description">
                Description
              </label>
              <textarea
                id="task-description"
                className="form-textarea"
                rows={3}
                placeholder="Details on what needs to be done in this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Initial Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="TODO">To Do (TODO)</option>
                  <option value="IN_PROGRESS">In Progress (IN_PROGRESS)</option>
                  <option value="DONE">Completed (DONE)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">Low (LOW)</option>
                  <option value="MEDIUM">Medium (MEDIUM)</option>
                  <option value="HIGH">High (HIGH)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label flex items-center gap-1">
                  <Calendar size={14} className="text-primary" />
                  <span>Due Date</span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label flex items-center gap-1">
                  <User size={14} className="text-primary" />
                  <span>Assign To</span>
                </label>
                <select
                  className="form-select"
                  value={userAssigneeId}
                  onChange={(e) => setUserAssigneeId(e.target.value)}
                >
                  {user && (
                    <option value={user.id}>
                      {user.username} (You - {user.email})
                    </option>
                  )}
                  {availableUsers
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner-sm"></span> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
