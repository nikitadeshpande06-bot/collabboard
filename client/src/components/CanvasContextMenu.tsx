/**
 * CanvasContextMenu
 *
 * Right-click context menu on the canvas that shows Cut / Copy / Paste / Delete
 * when an object is selected, and just Paste when the clipboard has content.
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface MenuItem {
  label:    string;
  icon:     string;
  shortcut: string;
  onClick:  () => void;
  disabled: boolean;
  danger?:  boolean;
}

interface Props {
  x:         number;
  y:         number;
  hasSelection: boolean;
  hasClipboard: boolean;
  onCut:     () => void;
  onCopy:    () => void;
  onPaste:   () => void;
  onDelete:  () => void;
  onClose:   () => void;
}

export default function CanvasContextMenu({
  x, y, hasSelection, hasClipboard,
  onCut, onCopy, onPaste, onDelete, onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown',   key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown',   key);
    };
  }, [onClose]);

  // Keep the menu inside the viewport
  const menuW = 192;
  const menuH = 192;
  const safeX = Math.min(x, window.innerWidth  - menuW - 8);
  const safeY = Math.min(y, window.innerHeight - menuH - 8);

  const items: MenuItem[] = [
    {
      label: 'Cut',    icon: '✂️', shortcut: 'Ctrl+X',
      onClick: () => { onCut();   onClose(); },
      disabled: !hasSelection,
    },
    {
      label: 'Copy',   icon: '📋', shortcut: 'Ctrl+C',
      onClick: () => { onCopy();  onClose(); },
      disabled: !hasSelection,
    },
    {
      label: 'Paste',  icon: '📌', shortcut: 'Ctrl+V',
      onClick: () => { onPaste(); onClose(); },
      disabled: !hasClipboard,
    },
    {
      label: 'Delete', icon: '🗑️', shortcut: 'Del',
      onClick: () => { onDelete(); onClose(); },
      disabled: !hasSelection,
      danger: true,
    },
  ];

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[10000] bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 w-48 select-none"
      style={{ left: safeX, top: safeY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest border-b border-gray-100 mb-1">
        Edit Object
      </p>

      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.disabled ? undefined : item.onClick}
          disabled={item.disabled}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors
            ${item.disabled
              ? 'opacity-35 cursor-not-allowed text-gray-400'
              : item.danger
                ? 'hover:bg-red-50 text-red-600 cursor-pointer'
                : 'hover:bg-gray-50 text-gray-700 cursor-pointer'
            }`}
        >
          <span className="text-base w-5 text-center">{item.icon}</span>
          <span className="flex-1 text-left font-medium">{item.label}</span>
          <span className="text-[10px] text-gray-400 font-mono">{item.shortcut}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
