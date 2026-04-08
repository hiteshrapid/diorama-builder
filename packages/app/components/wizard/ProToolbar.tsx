"use client";

interface ProToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const TOOL_BTN: React.CSSProperties = {
  padding: "4px 10px",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 5,
  fontSize: 12,
  cursor: "pointer",
  color: "#8090a0",
  fontFamily: "'SF Mono', 'Fira Code', monospace",
  display: "flex",
  alignItems: "center",
  gap: 5,
  whiteSpace: "nowrap",
};

const TOOL_BTN_ACTIVE: React.CSSProperties = {
  ...TOOL_BTN,
  background: "#1a2840",
  border: "1px solid #3b82f6",
  color: "#e0e8ff",
};

const DIVIDER: React.CSSProperties = {
  width: 1,
  height: 20,
  background: "#1e2d42",
  margin: "0 6px",
  flexShrink: 0,
};

const ICON_BTN: React.CSSProperties = {
  width: 28,
  height: 28,
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 5,
  fontSize: 14,
  cursor: "pointer",
  color: "#8090a0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const ICON_BTN_DISABLED: React.CSSProperties = {
  ...ICON_BTN,
  color: "#2a3545",
  cursor: "default",
};

export function ProToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: ProToolbarProps) {
  return (
    <div style={{
      height: 44,
      background: "rgba(8,14,24,0.94)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      gap: 4,
      userSelect: "none",
    }}>
      {/* Select indicator */}
      <div style={TOOL_BTN_ACTIVE}>
        <span>▸</span> Select
      </div>

      <div style={DIVIDER} />

      {/* Undo / Redo */}
      <button
        onClick={canUndo ? onUndo : undefined}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        style={canUndo ? { ...ICON_BTN, color: "#c0d0e0" } : ICON_BTN_DISABLED}
      >
        ↩
      </button>
      <button
        onClick={canRedo ? onRedo : undefined}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        style={canRedo ? { ...ICON_BTN, color: "#c0d0e0" } : ICON_BTN_DISABLED}
      >
        ↪
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Keyboard shortcut hint */}
      <div style={{ fontSize: 10, color: "#2a3545", fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
        D · delete &nbsp; Esc · cancel
      </div>
    </div>
  );
}
