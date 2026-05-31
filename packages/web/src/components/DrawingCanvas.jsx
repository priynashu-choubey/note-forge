import { useCallback, useRef, useState, useEffect } from 'react';

export default function DrawingCanvas({ note, onSave, theme }) {
  const [Excalidraw, setExcalidraw] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const excalidrawApiRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Dynamically import Excalidraw (it doesn't support SSR)
  useEffect(() => {
    let cancelled = false;
    import('@excalidraw/excalidraw').then((mod) => {
      if (!cancelled) {
        setExcalidraw(() => mod.Excalidraw);
        setLoaded(true);
      }
    }).catch((err) => {
      console.error('Failed to load Excalidraw:', err);
    });
    return () => { cancelled = true; };
  }, []);

  const handleChange = useCallback((elements, appState) => {
    if (!note || !elements) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      const sceneData = JSON.stringify({
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        },
      });
      onSave(note.id, { content: sceneData, version: note.version });
    }, 1000);
  }, [note, onSave]);

  if (!note) return null;

  const initialData = (() => {
    try {
      const parsed = JSON.parse(note.content || '{}');
      return {
        elements: parsed.elements || [],
        appState: {
          ...parsed.appState,
          theme: theme === 'dark' ? 'dark' : 'light',
        },
      };
    } catch {
      return { elements: [], appState: { theme: theme === 'dark' ? 'dark' : 'light' } };
    }
  })();

  if (!loaded || !Excalidraw) {
    return (
      <div className="drawing-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="drawing-canvas">
      <Excalidraw
        excalidrawAPI={(api) => { excalidrawApiRef.current = api; }}
        initialData={initialData}
        onChange={handleChange}
        theme={theme === 'dark' ? 'dark' : 'light'}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: { saveFileToDisk: true },
          },
        }}
      />
    </div>
  );
}
