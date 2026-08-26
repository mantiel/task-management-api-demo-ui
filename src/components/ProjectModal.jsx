import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { projectApi } from '../api/client';
import { FolderPlus, Palette, X, Check } from 'lucide-react';

const COLOR_PRESETS = [
  '#7c3aed', // Violet
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan / Teal
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#64748b', // Slate
];

export default function ProjectModal({ isOpen, onClose, onSuccess, projectToEdit = null }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#7c3aed');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name || '');
      setDescription(projectToEdit.description || '');
      setColor(projectToEdit.color || '#7c3aed');
    } else {
      setName('');
      setDescription('');
      setColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
    }
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Project name is required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (projectToEdit) {
        await projectApi.update(projectToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          color,
          ownerId: user?.id || 1,
        });
        showToast('Project updated successfully', 'success');
      } else {
        await projectApi.create(
          name.trim(),
          description.trim(),
          color,
          user?.id || 1
        );
        showToast('Project created successfully!', 'success');
      }

      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Error saving project', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <FolderPlus size={20} className="text-primary" />
            <h3 className="modal-title">
              {projectToEdit ? 'Edit Project' : 'New Project'}
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="project-name">
                Project Name *
              </label>
              <input
                id="project-name"
                type="text"
                className="form-input"
                placeholder="e.g. Web Platform Development"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="project-description">
                Description
              </label>
              <textarea
                id="project-description"
                className="form-textarea"
                rows={3}
                placeholder="Describe the goals and scope of this project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <Palette size={15} className="text-primary" />
                <span>Theme Color</span>
              </label>
              <div className="color-picker-grid">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`color-swatch ${color === preset ? 'selected' : ''}`}
                    style={{ backgroundColor: preset }}
                    onClick={() => setColor(preset)}
                    aria-label={`Select color ${preset}`}
                  >
                    {color === preset && <Check size={14} color="#fff" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  className="color-input-native"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  title="Choose custom color"
                />
                <span className="text-xs text-muted font-mono">{color}</span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <span className="spinner-sm"></span>
              ) : projectToEdit ? (
                'Save Changes'
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
