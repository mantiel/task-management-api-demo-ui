import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { taskApi, commentApi } from '../api/client';
import {
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  Calendar,
  User,
  Clock,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';

import ConfirmDialog from './ConfirmDialog';

export default function TaskDetailModal({ isOpen, onClose, taskId, onTaskUpdated, onTaskDeleted }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);

  // Edit Task State
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Comments State
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Delete Confirmations
  const [confirmDeleteTaskOpen, setConfirmDeleteTaskOpen] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState(null);

  const commentsContainerRef = useRef(null);

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const data = await taskApi.getById(taskId);
      setTask(data);
      setEditTitle(data.title || '');
      setEditDescription(data.description || '');
    } catch (err) {
      showToast(err.message || 'Error loading task details', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [taskId, showToast, onClose]);

  const loadComments = useCallback(async (showLoading = true) => {
    if (!taskId) return;
    if (showLoading) setLoadingComments(true);
    try {
      const data = await taskApi.getComments(taskId, true);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error loading comments:', err);
    } finally {
      if (showLoading) setLoadingComments(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTask();
      loadComments(true);
      setIsEditingTask(false);
      setEditingCommentId(null);
    }
  }, [isOpen, taskId, loadTask, loadComments]);

  // Keep comments scrolled to the bottom on load (like social/chat apps)
  useEffect(() => {
    if (!loadingComments && comments.length > 0) {
      if (commentsContainerRef.current) {
        commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
      }
    }
  }, [loadingComments, comments.length]);

  if (!isOpen) return null;

  const handleToggleComplete = async () => {
    if (!task) return;
    const isDone = task.status === 'DONE';
    const newStatus = isDone ? 'TODO' : 'DONE';

    setTask((prev) => ({
      ...prev,
      status: newStatus,
      completedAt: !isDone ? new Date().toISOString() : null,
    }));

    if (!isDone) {
      showToast('Task marked as completed! 🎉', 'success');
    } else {
      showToast('Task reopened (To Do)', 'info');
    }

    try {
      await taskApi.updateStatus(task.id, newStatus);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      console.warn('Could not sync status:', err);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      showToast('Title cannot be empty', 'warning');
      return;
    }
    setSavingTask(true);
    try {
      await taskApi.update(taskId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      showToast('Task updated successfully', 'success');
      setIsEditingTask(false);
      await loadTask();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      showToast(err.message || 'Error updating task', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  const confirmDeleteTask = async () => {
    setConfirmDeleteTaskOpen(false);
    try {
      await taskApi.delete(taskId);
      showToast('Task deleted successfully', 'info');
      if (onTaskDeleted) onTaskDeleted(taskId);
      onClose();
    } catch (err) {
      showToast(err.message || 'Error deleting task', 'error');
    }
  };

  const handleAddComment = async (e) => {
    if (e) e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    const content = newComment.trim();
    try {
      await taskApi.createComment(taskId, {
        content,
        createdAt: new Date().toISOString(),
        authorUserId: user?.id || 1,
        taskId: taskId,
      });
      setNewComment('');
      showToast('Comment added', 'success');
      await loadComments(false);
      setTimeout(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTo({
            top: commentsContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 50);
    } catch (err) {
      showToast(err.message || 'Error submitting comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleSaveEditedComment = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      await commentApi.update(commentId, editCommentText.trim());
      showToast('Comment updated', 'success');
      setEditingCommentId(null);
      await loadComments(false);
    } catch (err) {
      showToast(err.message || 'Error updating comment', 'error');
    }
  };

  const confirmDeleteComment = async () => {
    if (!commentToDeleteId) return;
    const id = commentToDeleteId;
    setCommentToDeleteId(null);
    try {
      await commentApi.delete(id);
      showToast('Comment deleted', 'info');
      await loadComments(false);
    } catch (err) {
      showToast(err.message || 'Error deleting comment', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
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

  const isDone = task?.status === 'DONE';

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content glass-card task-detail-modal-horizontal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="modal-header">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted">TASK #{taskId}</span>
              {task && (
                <span className={`status-badge status-${(task.status || 'TODO').toLowerCase()}`}>
                  {isDone ? 'Completed' : task.status === 'IN_PROGRESS' ? 'In Progress' : 'To Do'}
                </span>
              )}
              {task && getPriorityBadge(task.priority)}
            </div>

            <div className="flex items-center gap-2">
              {/* Complete / Reopen Button */}
              <button
                type="button"
                className={`btn btn-sm ${isDone ? 'btn-outline text-success' : 'btn-primary'}`}
                onClick={handleToggleComplete}
              >
                {isDone ? <RotateCcw size={13} /> : <Check size={14} />}
                <span>{isDone ? 'Reopen Task' : 'Complete Task'}</span>
              </button>

              {!isEditingTask && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setIsEditingTask(true)}
                  title="Edit Task"
                  aria-label="Edit Task"
                >
                  <Edit2 size={14} />
                </button>
              )}
              <button
                type="button"
                className="icon-btn text-danger"
                onClick={() => setConfirmDeleteTaskOpen(true)}
                title="Delete Task"
                aria-label="Delete Task"
              >
                <Trash2 size={14} />
              </button>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="spinner mx-auto mb-2"></div>
              <p className="text-muted text-xs">Loading details...</p>
            </div>
          ) : (
            <div className="task-modal-scrollable-body">
              {/* Top Section: Task Info & Metadata Card */}
              <div className="task-top-section">
                {isEditingTask ? (
                  <form onSubmit={handleUpdateTask} className="task-edit-form">
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-task-title">
                        Task Title
                      </label>
                      <input
                        id="edit-task-title"
                        type="text"
                        className="form-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-task-desc">
                        Description
                      </label>
                      <textarea
                        id="edit-task-desc"
                        className="form-textarea"
                        rows={3}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Add notes or task details..."
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setIsEditingTask(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={savingTask}
                      >
                        {savingTask ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="task-info-content">
                    <h2 className={`task-detail-title-large ${isDone ? 'line-through text-muted' : ''}`}>
                      {task?.title}
                    </h2>
                    <p className="task-detail-desc-wide">
                      {task?.description || <span className="text-muted italic">No description provided.</span>}
                    </p>

                    {/* Horizontal Metadata Strip */}
                    <div className="task-metadata-strip">
                      {task?.assignedUser && (
                        <div className="meta-pill">
                          <User size={13} className="text-primary" />
                          <span className="text-muted text-xs">Assignee:</span>
                          <span className="font-semibold text-xs text-main">
                            {task.assignedUser.username || `User #${task.assignedUser.id}`}
                          </span>
                        </div>
                      )}
                      {task?.dueDate && (
                        <div className="meta-pill">
                          <Calendar size={13} className="text-primary" />
                          <span className="text-muted text-xs">Due Date:</span>
                          <span className="font-semibold text-xs text-main">{formatDate(task.dueDate)}</span>
                        </div>
                      )}
                      {task?.createdAt && (
                        <div className="meta-pill">
                          <Clock size={13} className="text-muted" />
                          <span className="text-muted text-xs">Created:</span>
                          <span className="text-xs text-muted">{formatDate(task.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Full-Width Section: Comments Thread */}
              <div className="task-bottom-comments-section">
                <div className="comments-section-header">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-primary" />
                    <h3 className="comments-title">Comments & Activity</h3>
                    <span className="comments-count-pill">{comments.length}</span>
                  </div>
                  <span className="text-xs text-muted font-mono">Open Discussion</span>
                </div>

                {/* Comments Timeline */}
                <div ref={commentsContainerRef} className="wide-comments-container">
                  {loadingComments ? (
                    <div className="text-center py-6 text-xs text-muted">Loading comments...</div>
                  ) : comments.length === 0 ? (
                    <div className="empty-comments-wide">
                      <MessageSquare size={26} className="text-muted mb-2 opacity-30" />
                      <p className="text-xs text-muted">No comments on this task yet.</p>
                      <span className="text-xs text-muted opacity-70">Use the field below to start the conversation.</span>
                    </div>
                  ) : (
                    <div className="comments-stream">
                      {comments.map((comment) => {
                        const isAuthor = user?.id && Number(comment.ownerUserId) === Number(user.id);
                        const isAdmin = user?.role === 'ADMIN';
                        const canEdit = isAuthor;
                        const canDelete = isAuthor || isAdmin;

                        return (
                          <div key={comment.id} className="wide-comment-item">
                            <div className={`wide-comment-avatar ${isAuthor ? 'is-self' : ''}`}>
                              {comment.ownerUserId === user?.id
                                ? (user.username ? user.username.charAt(0).toUpperCase() : 'U')
                                : `#${comment.ownerUserId}`}
                            </div>

                            <div className="wide-comment-body">
                              <div className="wide-comment-header">
                                <div className="flex items-center gap-2">
                                  <span className="comment-author-name">
                                    {comment.ownerUserId === user?.id
                                      ? `${user.username} (You)`
                                      : `User #${comment.ownerUserId}`}
                                  </span>
                                  {isAuthor && <span className="author-pill">Author</span>}
                                </div>
                                <span className="comment-timestamp">{formatDate(comment.createdAt)}</span>
                              </div>

                              {editingCommentId === comment.id ? (
                                <div className="comment-inline-edit mt-2">
                                  <textarea
                                    className="form-textarea text-xs"
                                    rows={2}
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-1 mt-1">
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-xs"
                                      onClick={() => setEditingCommentId(null)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-xs"
                                      onClick={() => handleSaveEditedComment(comment.id)}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="wide-comment-text">{comment.content}</p>
                              )}

                              {(canEdit || canDelete) && editingCommentId !== comment.id && (
                                <div className="wide-comment-actions">
                                  {canEdit && (
                                    <button
                                      type="button"
                                      className="comment-action-link"
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditCommentText(comment.content);
                                      }}
                                    >
                                      <Edit2 size={11} />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      className="comment-action-link text-danger"
                                      onClick={() => setCommentToDeleteId(comment.id)}
                                    >
                                      <Trash2 size={11} />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Full-Width Comment Composer at Bottom */}
                <form onSubmit={handleAddComment} className="wide-composer-box">
                  <div className="composer-input-row">
                    <div className="composer-user-avatar">
                      {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="composer-text-area-wrap">
                      <textarea
                        className="composer-textarea"
                        placeholder="Write a comment or update for this task... (Ctrl + Enter to send)"
                        rows={2}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleCommentKeyDown}
                      />
                      <div className="composer-action-bar">
                        <span className="text-xs text-muted font-mono">Ctrl + Enter to send</span>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm"
                          disabled={submittingComment || !newComment.trim()}
                        >
                          <Send size={13} />
                          <span>{submittingComment ? 'Sending...' : 'Comment'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Delete Confirmation */}
      <ConfirmDialog
        isOpen={confirmDeleteTaskOpen}
        title="Delete this task?"
        message={`Do you want to permanently delete task "${task?.title}"? Its comments will also be deleted.`}
        confirmText="Delete Task"
        variant="danger"
        onConfirm={confirmDeleteTask}
        onCancel={() => setConfirmDeleteTaskOpen(false)}
      />

      {/* Comment Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!commentToDeleteId}
        title="Delete comment?"
        message="Are you sure you want to delete this comment?"
        confirmText="Delete"
        variant="danger"
        onConfirm={confirmDeleteComment}
        onCancel={() => setCommentToDeleteId(null)}
      />
    </>
  );
}
