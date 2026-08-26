import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { projectApi } from './api/client';
import { useToast } from './context/ToastContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProjectDetail from './components/ProjectDetail';
import ProjectModal from './components/ProjectModal';
import AuthPage from './components/AuthPage';
import CommandPalette from './components/CommandPalette';
import UserProfileModal from './components/UserProfileModal';
import ServerConfigModal from './components/ServerConfigModal';
import { Layers } from 'lucide-react';
import './App.css';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [activeProject, setActiveProject] = useState(null);

  // Modals & UI States
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingProjects(true);
    try {
      const response = await projectApi.getAll(0, 100);
      let list = [];
      if (response && response.content) {
        list = response.content;
      } else if (Array.isArray(response)) {
        list = response;
      }
      setProjects(list);

      // Keep active project updated or select first
      if (list.length > 0) {
        setActiveProject((prev) => {
          if (!prev) return list[0];
          const found = list.find((p) => p.id === prev.id);
          return found || list[0];
        });
      } else {
        setActiveProject(null);
      }
    } catch (err) {
      showToast(err.message || 'Error fetching projects', 'error');
    } finally {
      setLoadingProjects(false);
    }
  }, [isAuthenticated, showToast]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated, loadProjects]);

  // Global Keyboard Shortcuts (Ctrl+K for Command Palette)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="brand-logo-large mb-4">
          <Layers size={32} />
        </div>
        <div className="spinner mb-3"></div>
        <p className="text-muted font-medium text-sm">Loading TaskFlow...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const handleOpenNewProject = () => {
    setProjectToEdit(null);
    setProjectModalOpen(true);
  };

  const handleEditProject = (p) => {
    setProjectToEdit(p);
    setProjectModalOpen(true);
  };

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <Navbar
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenServerConfig={() => setServerModalOpen(true)}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Container: Sidebar + Workspace */}
      <div className="app-body">
        <Sidebar
          projects={projects}
          activeProject={activeProject}
          onSelectProject={(p) => setActiveProject(p)}
          onOpenNewProject={handleOpenNewProject}
          onEditProject={handleEditProject}
          onRefreshProjects={loadProjects}
          isCollapsed={sidebarCollapsed}
        />

        <main className="main-workspace">
          {loadingProjects && projects.length === 0 ? (
            <div className="workspace-loading">
              <div className="spinner mx-auto mb-2"></div>
              <p className="text-muted text-sm">Loading your projects...</p>
            </div>
          ) : (
            <ProjectDetail
              project={activeProject}
              onRefreshProject={loadProjects}
            />
          )}
        </main>
      </div>

      {/* Project Create / Edit Modal */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => {
          setProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        onSuccess={loadProjects}
        projectToEdit={projectToEdit}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => setActiveProject(p)}
        onOpenNewProject={handleOpenNewProject}
        onOpenNewTask={() => {
          const newTaskBtn = document.querySelector('.project-header-actions .btn-primary');
          if (newTaskBtn) newTaskBtn.click();
        }}
        onOpenServerConfig={() => setServerModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Server Config Modal */}
      <ServerConfigModal
        isOpen={serverModalOpen}
        onClose={() => setServerModalOpen(false)}
      />
    </div>
  );
}
