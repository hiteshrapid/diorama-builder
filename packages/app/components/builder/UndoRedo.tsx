"use client";

interface UndoRedoProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function UndoRedo({ canUndo, canRedo, onUndo, onRedo }: UndoRedoProps) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "8px 12px", borderBottom: "1px solid #1f2937" }}>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={{
          padding: "4px 10px",
          background: "transparent",
          color: canUndo ? "#8090c0" : "#333",
          border: "1px solid",
          borderColor: canUndo ? "#8090c044" : "#1f2937",
          borderRadius: 4,
          fontSize: 12,
          cursor: canUndo ? "pointer" : "default",
        }}
      >
        Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        style={{
          padding: "4px 10px",
          background: "transparent",
          color: canRedo ? "#8090c0" : "#333",
          border: "1px solid",
          borderColor: canRedo ? "#8090c044" : "#1f2937",
          borderRadius: 4,
          fontSize: 12,
          cursor: canRedo ? "pointer" : "default",
        }}
      >
        Redo
      </button>
    </div>
  );
}
