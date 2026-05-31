import { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useNotes } from './hooks/useNotes';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import MarkdownEditor from './components/MarkdownEditor';
import DrawingCanvas from './components/DrawingCanvas';
import AttachmentManager from './components/AttachmentManager';
import './index.css';

function AppContent() {
  const { user, loading, showAuth, isAuthenticated, logout } = useAuth();
  const {
    notes, folders, activeNote, syncStatus,
    openNote, createNote, saveNote, deleteNote,
    createFolder, deleteFolder, searchNotes,
  } = useNotes();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('noteforge_theme') || 'dark');

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('noteforge_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createNote('markdown');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNote]);

  if (loading) {
    return (
      <div className="app-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Auth Modal */}
      {showAuth && <AuthModal />}

      {/* Sidebar */}
      {isAuthenticated && (
        <Sidebar
          notes={notes}
          folders={folders}
          activeNote={activeNote}
          onSelectNote={openNote}
          onCreateNote={createNote}
          onCreateFolder={createFolder}
          onDeleteNote={deleteNote}
          onDeleteFolder={deleteFolder}
          onSearch={searchNotes}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(prev => !prev)}
          user={user}
          onLogout={logout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        {isAuthenticated && activeNote ? (
          <>
            {/* Header */}
            <div className="main-header">
              <div className="main-header-left">
                {sidebarCollapsed && (
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setSidebarCollapsed(false)}
                    title="Show sidebar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" x2="21" y1="6" y2="6"/>
                      <line x1="3" x2="21" y1="12" y2="12"/>
                      <line x1="3" x2="21" y1="18" y2="18"/>
                    </svg>
                  </button>
                )}
                <input
                  className="note-title-input"
                  value={activeNote.title || ''}
                  onChange={(e) => saveNote(activeNote.id, { title: e.target.value })}
                  placeholder="Untitled"
                  id="note-title"
                />
                <span className="note-type-badge" style={{ textTransform: 'capitalize' }}>
                  {activeNote.type}
                </span>
              </div>
              <div className="main-header-right">
                <div className={`sync-indicator ${syncStatus}`}>
                  <span className="sync-dot" />
                  {syncStatus === 'syncing' ? 'Saving...' :
                   syncStatus === 'synced' ? 'Saved' :
                   syncStatus === 'error' ? 'Error' : ''}
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => { if (confirm('Delete this note?')) deleteNote(activeNote.id); }}
                  title="Delete note"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    <line x1="10" x2="10" y1="11" y2="17"/>
                    <line x1="14" x2="14" y1="11" y2="17"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Editor or Canvas */}
            {activeNote.type === 'drawing' ? (
              <DrawingCanvas note={activeNote} onSave={saveNote} theme={theme} />
            ) : (
              <MarkdownEditor note={activeNote} onSave={saveNote} />
            )}

            {/* Attachments */}
            {activeNote.type === 'markdown' && (
              <AttachmentManager noteId={activeNote.id} />
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                <path d="M12 18v-6"/>
                <path d="M9 15h6"/>
              </svg>
            </div>
            <h2>Welcome to NoteForge</h2>
            <p>
              {isAuthenticated
                ? 'Select a note from the sidebar or create a new one to get started.'
                : 'Sign in to start creating notes, drawings, and more.'}
            </p>
            {isAuthenticated && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={() => createNote('markdown')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  New Note
                </button>
                <button className="btn btn-secondary" onClick={() => createNote('drawing')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/>
                  </svg>
                  New Drawing
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
