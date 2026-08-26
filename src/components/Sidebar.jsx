import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { projectApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from './ConfirmDialog';

export default function Sidebar({
  projects = [],
  activeProject,
  onSelectProject,
  onOpenNewProject,
  onEditProject,
  onRefreshProjects,
  isCollapsed = false,
}) {
  const [search, setSearch] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const { showToast } = useToast();

  const filteredProjects = projects.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    const { id, name } = projectToDelete;
    setProjectToDelete(null);

    try {
      await projectApi.delete(id);
      showToast(`Project "${name}" deleted`, 'info');
      onRefreshProjects();
    } catch (err) {
      showToast(err.message || 'Error deleting project', 'error');
    }
  };

  return (
    <>
      <aside className={`sidebar-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-primary" />
              <h2 className="sidebar-title">My Projects</h2>
            </div>
            <span className="badge-count">{projects.length}</span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block btn-sm"
            onClick={onOpenNewProject}
          >
            <FolderPlus size={15} />
            <span>New Project</span>
          </button>

          <div className="sidebar-search mt-3">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="sidebar-search-input"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="sidebar-projects-list">
          {filteredProjects.length === 0 ? (
            <div className="sidebar-empty">
              <Folder size={36} className="text-muted opacity-30 mx-auto mb-2" />
              <p className="text-xs text-muted mb-2">
                {search ? 'No matches found' : 'No projects yet.'}
              </p>
              {!search && (
                <button
                  type="button"
                  className="btn btn-outline btn-xs mx-auto"
                  onClick={onOpenNewProject}
                >
                  <Sparkles size={12} />
                  <span>Create first project</span>
                </button>
              )}
            </div>
          ) : (
            filteredProjects.map((p) => {
              const isSelected = activeProject?.id === p.id;
              const taskList = p.tasks || [];
              const taskCount = taskList.length;
              const doneCount = taskList.filter((t) => t.status === 'DONE').length;
              const progressPercent = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

              return (
                <div
                  key={p.id}
                  className={`project-nav-item ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectProject(p)}
                >
                  <div
                    className="project-color-dot"
                    style={{ backgroundColor: p.color || '#7c3aed' }}
                  />

                  <div className="project-nav-info">
                    <span className="project-nav-name">{p.name}</span>
                    <span className="project-nav-count">
                      {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                      {taskCount > 0 ? ` • ${progressPercent}%` : ''}
                    </span>
                    {taskCount > 0 && (
                      <div className="project-mini-progress">
                        <div
                          className="project-mini-progress-fill"
                          style={{
                            width: `${progressPercent}%`,
                            background: p.color || 'var(--gradient-primary)',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="project-nav-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="icon-btn-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === p.id ? null : p.id);
                      }}
                      title="Options"
                      aria-label="Project options"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {menuOpenId === p.id && (
                      <div className="dropdown-menu">
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            onEditProject(p);
                          }}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-item text-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            setProjectToDelete(p);
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <ChevronRight size={14} className="nav-arrow" />
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Custom Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!projectToDelete}
        title="Delete project?"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? All associated tasks and comments will be lost.`}
        confirmText="Delete Project"
        variant="danger"
        onConfirm={confirmDeleteProject}
        onCancel={() => setProjectToDelete(null)}
      />
    </>
  );
}
