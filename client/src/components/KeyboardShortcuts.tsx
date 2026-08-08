/**
 * Keyboard Shortcuts Overlay
 *
 * Press ? anywhere on the whiteboard page to see all shortcuts.
 * Professional tools (Figma, Sketch, VS Code) all have this.
 *
 * Why this impresses interviewers:
 *  – Shows attention to power-user UX
 *  – Demonstrates global keyboard event handling
 *  – Low-effort, high-signal feature
 */
import { useEffect, useState } from 'react';

const SHORTCUTS = [
  {
    group: 'Tools',
    items: [
      { keys: ['V'],        label: 'Select tool' },
      { keys: ['P'],        label: 'Pencil tool' },
      { keys: ['E'],        label: 'Eraser' },
      { keys: ['T'],        label: 'Text tool' },
      { keys: ['H'],        label: 'Pan tool' },
      { keys: ['R'],        label: 'Rectangle' },
      { keys: ['C'],        label: 'Circle' },
    ],
  },
  {
    group: 'Editing',
    items: [
      { keys: ['Ctrl', 'Z'],     label: 'Undo' },
      { keys: ['Ctrl', 'Y'],     label: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], label: 'Redo (alt)' },
      { keys: ['Delete'],        label: 'Delete selected' },
      { keys: ['Ctrl', 'A'],     label: 'Select all' },
      { keys: ['Escape'],        label: 'Deselect / cancel' },
    ],
  },
  {
    group: 'Text',
    items: [
      { keys: ['Ctrl', 'B'],  label: 'Bold' },
      { keys: ['Ctrl', 'I'],  label: 'Italic' },
      { keys: ['Ctrl', 'U'],  label: 'Underline' },
    ],
  },
  {
    group: 'Canvas',
    items: [
      { keys: ['Scroll'],            label: 'Zoom in / out' },
      { keys: ['Middle click', 'drag'], label: 'Pan canvas' },
      { keys: ['Ctrl', 'Shift', 'H'], label: 'Reset zoom' },
    ],
  },
  {
    group: 'App',
    items: [
      { keys: ['?'],       label: 'Show / hide shortcuts' },
      { keys: ['Ctrl', 'S'], label: 'Save version snapshot' },
    ],
  },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '?') setOpen((p) => !p);
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!open) {
    return (
      <button
        className="btn-ghost text-sm"
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts (?)"
      >
        ⌨ Shortcuts
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
            <div>
              <h2 className="text-lg font-bold">⌨ Keyboard Shortcuts</h2>
              <p className="text-xs text-gray-400">Press <Kbd>?</Kbd> to toggle this panel</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
          </div>

          {/* Grid */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {SHORTCUTS.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <Kbd>{k}</Kbd>
                            {i < item.keys.length - 1 && (
                              <span className="text-gray-300 text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-block bg-gray-100 border border-gray-300 text-gray-700 rounded px-1.5 py-0.5 text-[11px] font-mono font-medium shadow-sm">
      {children}
    </kbd>
  );
}
