import React, { useState, useEffect, useCallback } from 'react';
import { projectApi, userApi, taskApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  Kanban,
  List as ListIcon,
  Search,
  Calendar,
  User,
  MessageSquare,
  CheckCircle2,
  Check,
  FolderOpen,
  TrendingUp,
} from 'lucide-react';

import TaskModal from './TaskModal';
import TaskDetailModal from './TaskDetailModal';

const STATUS_COLUMNS = [
  { id: 'TODO', label: 'To Do', color: '#94a3b8' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: '#818cf8' },
  { id: 'DONE', label: 'Completed', color: '#34d399' },
];

export default function ProjectDetail({ project, onRefreshProject }) {
  const { showToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [users, setUsers] = useState([]);

  const loadTasks = useCallback(async () => {
    if (!project?.id) return;
    setLoadingTasks(true);
    try {
      const filters = {};
      if (filterStatus) filters.status = filterStatus;
      if (filterPriority) filters.priority = filterPriority;

      const data = await projectApi.getTasks(project.id, filters);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message || 'Error loading project tasks', 'error');
    } finally {
      setLoadingTasks(false);
    }
  }, [project?.id, filterStatus, filterPriority, showToast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    userApi
      .getAllUsers(0, 50)
      .then((res) => {
        if (res && res.content) setUsers(res.content);
        else if (Array.isArray(res)) setUsers(res);
      })
      .catch((err) => console.warn('Could not load users:', err));
  }, []);

  // Drag & Drop Handlers (Native HTML5)
  const handleDragStart = (e, task) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e, columnId) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskIdStr = e.dataTransfer.getData('text/plain') || draggedTaskId;
    const taskId = Number(taskIdStr);
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    const previousStatus = task.status;

    // Optimistic UI Update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: targetStatus,
              completedAt: targetStatus === 'DONE' ? new Date().toISOString() : null,
            }
          : t
      )
    );

    const statusLabels = {
      TODO: 'To Do',
      IN_PROGRESS: 'In Progress',
      DONE: 'Completed 🎉',
    };
    showToast(`Task moved to "${statusLabels[targetStatus]}"`, 'info', 2500);

    try {
      // Calls updateStatus helper with fail-fast / fallback
      await taskApi.updateStatus(taskId, targetStatus);
    } catch (err) {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: previousStatus } : t
        )
      );
      showToast('Error updating status on server', 'error');
    } finally {
      setDraggedTaskId(null);
    }
  };

  // Quick toggle task completion
  const handleToggleComplete = async (e, task) => {
    e.stopPropagation();
    const isCurrentlyDone = task.status === 'DONE';
    const newStatus = isCurrentlyDone ? 'TODO' : 'DONE';

    // Optimistic UI update
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: newStatus,
              completedAt: !isCurrentlyDone ? new Date().toISOString() : null,
            }
          : t
      )
    );

    if (!isCurrentlyDone) {
      showToast('Task completed successfully! 🎉', 'success');
    } else {
      showToast('Task reopened (To Do)', 'info');
    }

    try {
      await taskApi.updateStatus(task.id, newStatus);
    } catch (err) {
      console.warn('Could not sync status:', err);
    }
  };

  if (!project) {
    return (
      <div className="empty-project-view">
        <div className="empty-content">
          <div className="empty-icon-wrap">
            <FolderOpen size={30} className="text-primary" />
          </div>
          <h2 className="mt-4 mb-2">Select or create a Project</h2>
          <p className="text-muted text-sm max-w-md mx-auto">
            Choose a project from the sidebar or press <code>Ctrl+K</code> to search and start organizing tasks.
          </p>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.assignedUser?.username?.toLowerCase().includes(q)
    );
  });

  const getTasksByStatus = (status) => {
    return filteredTasks.filter((t) => (t.status || 'TODO') === status);
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'HIGH':
        return <span className="priority-pill priority-high">High</span>;
      case 'LOW':
        return <span className="priority-pill priority-low">Low</span>;
      default:
        return <span className="priority-pill priority-medium">Medium</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => (t.status || 'TODO') === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
  };

  const completionPercent =
    stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="project-detail-container">
      {/* Project Banner & Stats */}
      <div className="project-banner">
        <div className="project-banner-header">
          <div className="project-title-area">
            <div className="project-meta-top">
              <span
                className="project-badge-tag"
                style={{
                  backgroundColor: `${project.color || '#7c3aed'}18`,
                  color: project.color || '#7c3aed',
                  borderColor: `${project.color || '#7c3aed'}35`,
                }}
              >
                PROJECT #{project.id}
              </span>
              {project.owner && (
                <span className="owner-tag">
                  <User size={12} />
                  <span>{project.owner.username}</span>
                </span>
              )}
            </div>

            <h1 className="project-title">{project.name}</h1>
            {project.description && (
              <p className="project-description">{project.description}</p>
            )}
          </div>

          <div className="project-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setTaskModalOpen(true)}
            >
              <Plus size={16} />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Project Progress Bar */}
        <div className="project-progress-section">
          <div className="project-progress-label">
            <span className="project-progress-text flex items-center gap-1">
              <TrendingUp size={13} />
              <span>Project Progress</span>
            </span>
            <span className="project-progress-percent">{completionPercent}% completed</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${completionPercent}%`,
                background: project.color || 'var(--gradient-primary)',
              }}
            />
          </div>
        </div>

        {/* Minimalist Stats Row */}
        <div className="project-stats-row">
          <div className="stat-box">
            <span className="stat-label">Total</span>
            <span className="stat-val">{stats.total}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label text-todo">To Do</span>
            <span className="stat-val">{stats.todo}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label text-progress">In Progress</span>
            <span className="stat-val">{stats.inProgress}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label text-done">Completed</span>
            <span className="stat-val">{stats.done}</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, View Switcher */}
      <div className="tasks-control-bar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search tasks or assignees in this project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Completed</option>
          </select>

          <select
            className="filter-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>

          <div className="view-toggle-group">
            <button
              type="button"
              className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Kanban Board (Drag & Drop)"
              aria-label="Kanban Board"
            >
              <Kanban size={15} />
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
              aria-label="List View"
            >
              <ListIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Task Content: Kanban (Drag & Drop) or List */}
      {loadingTasks ? (
        <div className="kanban-grid">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.id} className="kanban-column">
              <div className="column-header">
                <div className="flex items-center gap-2">
                  <span className="column-indicator" style={{ backgroundColor: col.color }}></span>
                  <h3 className="column-title">{col.label}</h3>
                </div>
              </div>
              <div className="skeleton-task-list">
                <div className="skeleton-task-card">
                  <div className="skeleton skeleton-text w-75"></div>
                  <div className="skeleton skeleton-text w-50"></div>
                </div>
                <div className="skeleton-task-card">
                  <div className="skeleton skeleton-text w-50"></div>
                  <div className="skeleton skeleton-text w-40"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="no-tasks-state glass-card">
          <div className="empty-icon-wrap mb-3">
            <CheckCircle2 size={30} className="text-muted" />
          </div>
          <h3>No tasks here</h3>
          <p className="text-muted text-xs max-w-sm mx-auto mb-4">
            {searchQuery || filterStatus || filterPriority
              ? 'No results matching the applied filters.'
              : 'Organize work by creating the first task for this project.'}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm mx-auto"
            onClick={() => setTaskModalOpen(true)}
          >
            <Plus size={14} />
            <span>Create First Task</span>
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD WITH NATIVE DRAG & DROP */
        <div className="kanban-grid">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = getTasksByStatus(col.id);
            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                className={`kanban-column ${isOver ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={(e) => handleDragLeave(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="column-header">
                  <div className="flex items-center gap-2">
                    <span className="column-indicator" style={{ backgroundColor: col.color }}></span>
                    <h3 className="column-title">{col.label}</h3>
                  </div>
                  <span className="column-count">{colTasks.length}</span>
                </div>

                <div className="column-cards-container">
                  {colTasks.length === 0 ? (
                    <div className="empty-column-slot">
                      {isOver ? 'Drop here to move' : 'Drag tasks here'}
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const isDone = t.status === 'DONE';
                      const isDragging = draggedTaskId === t.id;

                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t)}
                          className={`task-card ${isDone ? 'is-completed' : ''} ${
                            isDragging ? 'dragging' : ''
                          }`}
                          onClick={() => setSelectedTaskId(t.id)}
                        >
                          <div className="task-card-header">
                            <div className="flex-1 min-w-0">
                              <h4 className={`task-card-title ${isDone ? 'line-through text-muted' : ''}`}>
                                {t.title}
                              </h4>
                            </div>

                            {getPriorityBadge(t.priority)}
                          </div>

                          {t.description && (
                            <p className="task-card-desc">{t.description}</p>
                          )}

                          <div className="task-card-bottom">
                            <div className="flex items-center gap-2">
                              {t.assignedUser && (
                                <div
                                  className="assignee-avatar"
                                  title={`Assigned: ${t.assignedUser.username || t.assignedUser.email}`}
                                >
                                  {t.assignedUser.username
                                    ? t.assignedUser.username.charAt(0).toUpperCase()
                                    : 'U'}
                                </div>
                              )}
                              {t.dueDate && (
                                <span className="due-date-tag">
                                  <Calendar size={12} />
                                  <span>{formatDate(t.dueDate)}</span>
                                </span>
                              )}
                            </div>

                            <div className="task-comments-badge">
                              <MessageSquare size={12} />
                              <span>Details</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="list-view-card">
          <div className="table-responsive">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => {
                  const isDone = t.status === 'DONE';
                  return (
                    <tr
                      key={t.id}
                      className={`task-row ${isDone ? 'row-completed' : ''}`}
                      onClick={() => setSelectedTaskId(t.id)}
                    >
                      <td>
                        <div className={`font-semibold text-sm ${isDone ? 'line-through text-muted' : ''}`}>
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="text-xs text-muted truncate max-w-md mt-0.5">
                            {t.description}
                          </div>
                        )}
                      </td>

                      <td>
                        <span className={`status-badge status-${(t.status || 'TODO').toLowerCase()}`}>
                          {t.status === 'DONE'
                            ? 'Completed'
                            : t.status === 'IN_PROGRESS'
                              ? 'In Progress'
                              : 'To Do'}
                        </span>
                      </td>
                      <td>{getPriorityBadge(t.priority)}</td>
                      <td>
                        {t.assignedUser ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <User size={12} className="text-muted" />
                            <span>{t.assignedUser.username || t.assignedUser.email}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {t.dueDate ? (
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(t.dueDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskId(t.id);
                          }}
                        >
                          <MessageSquare size={12} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Modal for Creating */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSuccess={() => {
          loadTasks();
          if (onRefreshProject) onRefreshProject();
        }}
        projectId={project.id}
        users={users}
      />

      {/* Task Detail & Comments Modal */}
      <TaskDetailModal
        isOpen={!!selectedTaskId}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={() => {
          loadTasks();
          if (onRefreshProject) onRefreshProject();
        }}
        onTaskDeleted={() => {
          setSelectedTaskId(null);
          loadTasks();
          if (onRefreshProject) onRefreshProject();
        }}
      />
    </div>
  );
}
