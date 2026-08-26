import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Folder,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  projects = [],
  activeProject,
  onSelectProject,
  onOpenNewProject,
  onOpenNewTask,
  onOpenServerConfig,
  onOpenProfile,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build searchable items
  const projectItems = projects
    .filter((p) => p.name?.toLowerCase().includes(query.toLowerCase()) || p.description?.toLowerCase().includes(query.toLowerCase()))
    .map((p) => ({
      id: `proj-${p.id}`,
      type: 'project',
      title: p.name,
      subtitle: `${p.tasks ? p.tasks.length : 0} tasks • Project #${p.id}`,
      action: () => {
        onSelectProject(p);
        onClose();
      },
    }));

  const actionItems = [
    {
      id: 'act-new-project',
      type: 'action',
      title: 'Create New Project',
      subtitle: 'Create a workspace with custom color',
      action: () => {
        onClose();
        onOpenNewProject();
      },
    },
    ...(activeProject
      ? [
          {
            id: 'act-new-task',
            type: 'action',
            title: `New Task in "${activeProject.name}"`,
            subtitle: 'Add a task to the current board',
            action: () => {
              onClose();
              onOpenNewTask();
            },
          },
        ]
      : []),
    {
      id: 'act-server-config',
      type: 'action',
      title: 'Backend Server Configuration',
      subtitle: 'Adjust base URL or test Spring Boot connection',
      action: () => {
        onClose();
        onOpenServerConfig();
      },
    },
    {
      id: 'act-profile',
      type: 'action',
      title: 'My User Profile',
      subtitle: 'View or edit username',
      action: () => {
        onClose();
        onOpenProfile();
      },
    },
  ].filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const allResults = [...projectItems, ...actionItems];

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        allResults[selectedIndex].action();
      }
    }
  };

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command or search projects..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="command-palette-shortcut">ESC to close</span>
        </div>

        <div className="command-palette-results">
          {allResults.length === 0 ? (
            <div className="command-palette-empty">
              No results found for "{query}"
            </div>
          ) : (
            <>
              {projectItems.length > 0 && (
                <div className="command-palette-section">
                  <div className="command-palette-section-title">Projects</div>
                  {projectItems.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <div
                        key={item.id}
                        className={`command-palette-item ${isSelected ? 'active' : ''}`}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className="command-palette-item-icon project">
                          <Folder size={16} />
                        </div>
                        <div className="command-palette-item-text">
                          <div className="command-palette-item-title">{item.title}</div>
                          <div className="command-palette-item-subtitle">{item.subtitle}</div>
                        </div>
                        <ArrowRight size={14} className="text-muted" />
                      </div>
                    );
                  })}
                </div>
              )}

              {actionItems.length > 0 && (
                <div className="command-palette-section">
                  <div className="command-palette-section-title">Quick Actions</div>
                  {actionItems.map((item, idx) => {
                    const actualIdx = projectItems.length + idx;
                    const isSelected = selectedIndex === actualIdx;
                    return (
                      <div
                        key={item.id}
                        className={`command-palette-item ${isSelected ? 'active' : ''}`}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(actualIdx)}
                      >
                        <div className="command-palette-item-icon action">
                          <Sparkles size={16} />
                        </div>
                        <div className="command-palette-item-text">
                          <div className="command-palette-item-title">{item.title}</div>
                          <div className="command-palette-item-subtitle">{item.subtitle}</div>
                        </div>
                        <ArrowRight size={14} className="text-muted" />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="command-palette-footer">
          <div className="flex items-center gap-3">
            <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
            <span><kbd>↵</kbd> to select</span>
          </div>
          <span>TaskFlow Quick Menu</span>
        </div>
      </div>
    </div>
  );
}
