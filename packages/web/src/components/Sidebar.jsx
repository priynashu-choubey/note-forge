import { useState, useRef, useCallback } from 'react';

export default function Sidebar({
  notes,
  folders,
  activeNote,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onDeleteNote,
  onDeleteFolder,
  onSearch,
  collapsed,
  onToggle,
  user,
  onLogout,
  theme,
  onToggleTheme,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const searchTimerRef = useRef(null);

  const handleSearch = useCallback((value) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  }, [onSearch]);

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  // Get notes without a folder
  const unfolderedNotes = notes.filter(n => !n.folder_id);

  // Get notes for a specific folder
  const getNotesForFolder = (folderId) => notes.filter(n => n.folder_id === folderId);

  const renderNoteItem = (note) => (
    <div
      key={note.id}
      className={`note-item ${activeNote?.id === note.id ? 'active' : ''}`}
      onClick={() => onSelectNote(note.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (confirm('Delete this note?')) onDeleteNote(note.id);
      }}
    >
      <span className="note-icon">
        {note.type === 'drawing' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/>
            <path d="m14 7 3 3"/>
            <path d="M5 6v4"/>
            <path d="M19 14v4"/>
            <path d="M10 2v2"/>
            <path d="M7 8H3"/>
            <path d="M21 16h-4"/>
            <path d="M11 3H9"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            <path d="M10 9H8"/>
            <path d="M16 13H8"/>
            <path d="M16 17H8"/>
          </svg>
        )}
      </span>
      <span className="note-title">{note.title || 'Untitled'}</span>
      {note.type === 'drawing' && <span className="note-type-badge">draw</span>}
    </div>
  );

  const renderFolder = (folder) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderNotes = getNotesForFolder(folder.id);

    return (
      <div key={folder.id} className="folder-item">
        <div
          className="folder-header"
          onClick={() => toggleFolder(folder.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (confirm('Delete this folder and all its contents?')) onDeleteFolder(folder.id);
          }}
        >
          <svg className={`chevron ${isExpanded ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6"/>
          </svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
          </svg>
          <span style={{ flex: 1 }}>{folder.name}</span>
          <span style={{ fontSize: '10px', opacity: 0.5 }}>{folderNotes.length}</span>
        </div>
        {isExpanded && (
          <div className="folder-children">
            {folder.children?.map(child => renderFolder(child))}
            {folderNotes.map(renderNoteItem)}
            {folderNotes.length === 0 && !folder.children?.length && (
              <div style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Empty folder
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c5cfc" />
                <stop offset="100%" stopColor="#5ce0d8" />
              </linearGradient>
            </defs>
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
          </svg>
          NoteForge
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onToggle} title="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M9 3v18"/>
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <input
          type="text"
          className="input"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          id="sidebar-search"
        />
      </div>

      {/* Actions */}
      <div className="sidebar-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onCreateNote('markdown')}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Note
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => onCreateNote('drawing')}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/>
          </svg>
          Draw
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowNewFolder(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Folder
        </button>
      </div>

      {/* New Folder Input */}
      {showNewFolder && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: '4px' }}>
          <input
            className="input"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') setShowNewFolder(false);
            }}
            autoFocus
          />
          <button className="btn btn-ghost btn-sm" onClick={() => setShowNewFolder(false)}>✕</button>
        </div>
      )}

      {/* Notes & Folders Tree */}
      <div className="sidebar-content">
        {folders.map(renderFolder)}

        {unfolderedNotes.length > 0 && (
          <>
            {folders.length > 0 && (
              <div style={{ padding: '8px 12px 4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>
                Notes
              </div>
            )}
            {unfolderedNotes.map(renderNoteItem)}
          </>
        )}

        {notes.length === 0 && !searchQuery && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            No notes yet. Create one!
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '100px' }} className="truncate">
            {user?.name || user?.email || 'Guest'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button className="theme-toggle" onClick={onToggleTheme} title="Toggle theme">
            <div className="toggle-thumb">
              {theme === 'dark' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              )}
            </div>
          </button>
          <button className="btn btn-ghost btn-icon" onClick={onLogout} title="Sign out" style={{ width: '28px', height: '28px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
