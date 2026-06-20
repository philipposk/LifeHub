"use client";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "⌘K", label: "Open command palette (search · create · navigate)" },
  { keys: "/", label: "Open command palette" },
  { keys: "N", label: "Jump to Tasks" },
  { keys: "?", label: "Show this help" },
  { keys: "Esc", label: "Close palette / menus / dialogs" },
  { keys: "⌘↵", label: "Save (Quick capture, Note editor)" },
  { keys: "↵", label: "Add task (in an add-task field)" },
  { keys: "2×click", label: "Rename a task" },
  { keys: "⋯", label: "Task menu: focus · move · delete (hover a task)" },
];

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="cp-backdrop" onClick={onClose}>
      <div className="shortcuts" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-hd">Keyboard shortcuts</div>
        <div className="shortcuts-list">
          {SHORTCUTS.map(s => (
            <div className="shortcuts-row" key={s.keys + s.label}>
              <kbd className="kbd">{s.keys}</kbd>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        <div className="shortcuts-foot">Press <kbd className="kbd">Esc</kbd> to close</div>
      </div>
    </div>
  );
}
