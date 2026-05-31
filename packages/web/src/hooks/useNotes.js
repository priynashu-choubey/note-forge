import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function useNotes() {
  const { isAuthenticated } = useAuth();
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [flatFolders, setFlatFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, error
  const saveTimerRef = useRef(null);

  // Fetch notes and folders
  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [notesData, foldersData] = await Promise.all([
        api.getNotes({ limit: 200 }),
        api.getFolders(),
      ]);
      setNotes(notesData.notes || []);
      setFolders(foldersData.folders || []);
      setFlatFolders(foldersData.flat || []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Open a note (fetch full content)
  const openNote = useCallback(async (noteId) => {
    try {
      const data = await api.getNote(noteId);
      setActiveNote(data.note);
      return data.note;
    } catch (err) {
      console.error('Failed to open note:', err);
      return null;
    }
  }, []);

  // Create note
  const createNote = useCallback(async (type = 'markdown', folderId = null) => {
    try {
      const data = await api.createNote({
        title: type === 'drawing' ? 'Untitled Drawing' : 'Untitled',
        type,
        content: type === 'drawing' ? '{}' : '',
        folderId,
      });
      setNotes(prev => [data.note, ...prev]);
      setActiveNote(data.note);
      return data.note;
    } catch (err) {
      console.error('Failed to create note:', err);
      return null;
    }
  }, []);

  // Save note (debounced)
  const saveNote = useCallback((noteId, updates) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSyncStatus('syncing');

    saveTimerRef.current = setTimeout(async () => {
      try {
        const data = await api.updateNote(noteId, updates);
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...data.note } : n));
        if (data.note) {
          setActiveNote(prev => prev?.id === noteId ? { ...prev, ...data.note } : prev);
        }
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (err) {
        console.error('Failed to save note:', err);
        setSyncStatus('error');
      }
    }, 500);
  }, []);

  // Delete note
  const deleteNote = useCallback(async (noteId) => {
    try {
      await api.deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (activeNote?.id === noteId) {
        setActiveNote(null);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }, [activeNote]);

  // Create folder
  const createFolder = useCallback(async (name, parentId = null) => {
    try {
      const data = await api.createFolder({ name, parentId });
      await fetchAll(); // Refresh tree
      return data.folder;
    } catch (err) {
      console.error('Failed to create folder:', err);
      return null;
    }
  }, [fetchAll]);

  // Delete folder
  const deleteFolder = useCallback(async (folderId) => {
    try {
      await api.deleteFolder(folderId);
      await fetchAll();
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  }, [fetchAll]);

  // Search
  const searchNotes = useCallback(async (q) => {
    if (!q.trim()) {
      await fetchAll();
      return;
    }
    try {
      const data = await api.searchNotes(q);
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, [fetchAll]);

  return {
    notes,
    folders,
    flatFolders,
    loading,
    activeNote,
    syncStatus,
    setActiveNote,
    openNote,
    createNote,
    saveNote,
    deleteNote,
    createFolder,
    deleteFolder,
    searchNotes,
    refreshNotes: fetchAll,
  };
}
