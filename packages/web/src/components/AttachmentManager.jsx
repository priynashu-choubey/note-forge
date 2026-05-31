import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../api/client';

export default function AttachmentManager({ noteId }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragover, setDragover] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [viewingImage, setViewingImage] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch attachments
  useEffect(() => {
    if (!noteId) return;
    api.getAttachments(noteId).then(data => {
      setAttachments(data.attachments || []);
      if (data.attachments?.length > 0) setCollapsed(false);
    }).catch(console.error);
  }, [noteId]);

  const handleUpload = useCallback(async (files) => {
    if (!noteId || files.length === 0) return;
    setUploading(true);

    for (const file of files) {
      try {
        const data = await api.uploadFile(file, noteId);
        setAttachments(prev => [data.attachment, ...prev]);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setUploading(false);
    setCollapsed(false);
  }, [noteId]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragover(false);
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  }, [handleUpload]);

  const handleDelete = useCallback(async (attachmentId) => {
    try {
      await api.deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, []);

  if (!noteId) return null;

  return (
    <>
      <div
        className={`attachments-bar ${collapsed ? 'collapsed' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
      >
        <div className="attachments-header" onClick={() => setCollapsed(!collapsed)}>
          <h4>
            📎 Attachments ({attachments.length})
            {uploading && <span className="spinner" style={{ marginLeft: '8px', width: '14px', height: '14px' }} />}
          </h4>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              title="Upload file"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" x2="12" y1="3" y2="15"/>
              </svg>
            </button>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}
            >
              <path d="m18 15-6-6-6 6"/>
            </svg>
          </div>
        </div>

        {!collapsed && (
          <div className="attachments-grid">
            {dragover && (
              <div className="drop-zone dragover" style={{ minWidth: '100px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                Drop here
              </div>
            )}
            {attachments.map(att => (
              <div
                key={att.id}
                className="attachment-card"
                onClick={() => {
                  if (att.mime_type.startsWith('image/')) {
                    setViewingImage(att);
                  } else {
                    window.open(`${api.baseUrl}/media/${att.id}`, '_blank');
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (confirm('Delete this attachment?')) handleDelete(att.id);
                }}
              >
                {att.mime_type.startsWith('image/') ? (
                  <img
                    src={att.thumbnail_key ? api.getThumbnailUrl(att.id) : api.getFileUrl(att.id)}
                    alt={att.filename}
                    className="attachment-thumb"
                    loading="lazy"
                  />
                ) : (
                  <div className="attachment-thumb-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                      <path d="M10 12h4"/>
                      <path d="M10 16h4"/>
                    </svg>
                  </div>
                )}
                <div className="attachment-name">{att.filename}</div>
              </div>
            ))}
            {attachments.length === 0 && !dragover && (
              <div style={{ padding: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Drag & drop or click upload
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(Array.from(e.target.files))}
        />
      </div>

      {/* Lightbox */}
      {viewingImage && (
        <div className="lightbox" onClick={() => setViewingImage(null)}>
          <button className="btn btn-ghost lightbox-close" onClick={() => setViewingImage(null)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
          <img
            src={api.getFileUrl(viewingImage.id)}
            alt={viewingImage.filename}
          />
        </div>
      )}
    </>
  );
}
