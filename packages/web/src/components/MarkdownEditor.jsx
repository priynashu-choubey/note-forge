import { useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';

export default function MarkdownEditor({ note, onSave }) {
  const handleChange = useCallback((value) => {
    if (note && value !== undefined) {
      onSave(note.id, { content: value, version: note.version });
    }
  }, [note, onSave]);

  if (!note) return null;

  return (
    <div className="editor-area" data-color-mode="dark">
      <MDEditor
        value={note.content || ''}
        onChange={handleChange}
        height="100%"
        visibleDragbar={false}
        preview="live"
        hideToolbar={false}
        enableScroll={true}
      />
    </div>
  );
}
