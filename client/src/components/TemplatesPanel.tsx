import { useState } from 'react';
import toast from 'react-hot-toast';
import type { CanvasEngine } from '@/canvas/CanvasEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// ── All known Kanban columns the user can pick from ───────────────────────────
const KANBAN_COLUMN_OPTIONS = [
  { id: 'todo',        label: '📋 To Do',       fill: '#3b82f6' },
  { id: 'inprogress',  label: '⚡ In Progress',  fill: '#f97316' },
  { id: 'review',      label: '🔍 In Review',    fill: '#a855f7' },
  { id: 'blocked',     label: '🚫 Blocked',      fill: '#ef4444' },
  { id: 'testing',     label: '🧪 Testing',      fill: '#06b6d4' },
  { id: 'done',        label: '✅ Done',          fill: '#22c55e' },
  { id: 'custom',      label: '✏️ Custom…',       fill: '#6b7280' },
];

// ─────────────────────────────────────────────────────────────────────────────
// JSON builders — each accepts the user's edited values and returns Fabric JSON
// ─────────────────────────────────────────────────────────────────────────────

function buildKanbanJSON(columns: { label: string; fill: string }[]) {
  const COL_W = 195;
  const GAP   = 25;
  const objects: object[] = [];

  columns.forEach((col, i) => {
    const left = 40 + i * (COL_W + GAP);
    // header bg
    objects.push({
      type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
      left, top: 40, width: COL_W, height: 44, fill: col.fill,
      rx: 8, ry: 8, stroke: 'transparent', strokeWidth: 0,
    });
    // header text
    objects.push({
      type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
      left: left + 12, top: 53, text: col.label,
      fontSize: 13, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Arial',
    });
    // two placeholder cards
    [0, 1].forEach((j) => {
      const top = 110 + j * 62;
      objects.push({
        type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
        left, top, width: COL_W, height: 52,
        fill: '#f7f8fa', stroke: '#e5e7eb', strokeWidth: 1, rx: 6, ry: 6,
      });
      objects.push({
        type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
        left: left + 10, top: top + 16,
        text: `${col.label.replace(/^[^\s]+\s/, '')} task ${j + 1}`,
        fontSize: 12, fill: '#1f2328', fontFamily: 'Arial',
      });
    });
  });

  return { version: '5.3.0', objects };
}

function buildRetroJSON(labels: [string, string, string]) {
  const fills = ['#22c55e', '#f97316', '#3b82f6'] as const;
  const objects: object[] = [];
  labels.forEach((label, i) => {
    const left = 40 + i * 240;
    objects.push(
      { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
        left, top: 30, width: 210, height: 50, fill: fills[i],
        rx: 10, ry: 10, stroke: 'transparent', strokeWidth: 0 },
      { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
        left: left + 14, top: 46, text: label,
        fontSize: 14, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Arial' },
      { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
        left, top: 100, width: 210, height: 80,
        fill: '#fef08a', stroke: '#ca8a04', strokeWidth: 1, rx: 4, ry: 4 },
      { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
        left: left + 10, top: 118, text: 'Click to edit…',
        fontSize: 12, fill: '#713f12', fontFamily: 'Arial' },
    );
  });
  return { version: '5.3.0', objects };
}

function buildMindMapJSON(center: string, topics: string[]) {
  const positions = [
    { left: 60,  top: 80  },
    { left: 520, top: 80  },
    { left: 60,  top: 300 },
    { left: 520, top: 300 },
  ];
  const objects: object[] = [
    { type: 'ellipse', version: '5.3.0', originX: 'left', originY: 'top',
      left: 280, top: 180, rx: 80, ry: 40,
      fill: '#3b82f6', stroke: '#1d4ed8', strokeWidth: 2 },
    { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
      left: 310, top: 208, text: center,
      fontSize: 15, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Arial' },
  ];
  topics.slice(0, 4).forEach((text, i) => {
    const { left, top } = positions[i];
    objects.push(
      { type: 'ellipse', version: '5.3.0', originX: 'left', originY: 'top',
        left, top, rx: 60, ry: 28,
        fill: '#eff6ff', stroke: '#3b82f6', strokeWidth: 1.5 },
      { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
        left: left + 20, top: top + 12, text,
        fontSize: 13, fill: '#1d4ed8', fontFamily: 'Arial' },
    );
  });
  return { version: '5.3.0', objects };
}

function buildBrainstormJSON(ideas: string[]) {
  const positions = [
    { left: 40,  top: 40,  fill: '#fef3c7', stroke: '#f59e0b', textColor: '#92400e' },
    { left: 320, top: 40,  fill: '#dbeafe', stroke: '#3b82f6', textColor: '#1d4ed8' },
    { left: 40,  top: 170, fill: '#dcfce7', stroke: '#16a34a', textColor: '#166534' },
    { left: 320, top: 170, fill: '#ede9fe', stroke: '#7c3aed', textColor: '#5b21b6' },
  ];
  const objects: object[] = [];
  ideas.slice(0, 4).forEach((text, i) => {
    const p = positions[i];
    objects.push(
      { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
        left: p.left, top: p.top, width: 220, height: 90,
        fill: p.fill, stroke: p.stroke, strokeWidth: 2, rx: 12, ry: 12 },
      { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
        left: p.left + 12, top: p.top + 22, text,
        fontSize: 14, fontWeight: 'bold', fill: p.textColor, fontFamily: 'Arial' },
    );
  });
  return { version: '5.3.0', objects };
}

// ─────────────────────────────────────────────────────────────────────────────
// Template registry (no json — built dynamically from editable state)
// ─────────────────────────────────────────────────────────────────────────────

export const TEMPLATES: Template[] = [
  { id: 'blank',      name: 'Blank Canvas',  description: 'Start from scratch',             icon: '⬜' },
  { id: 'kanban',     name: 'Kanban Board',  description: 'Choose columns & customise',     icon: '📋' },
  { id: 'retro',      name: 'Retrospective', description: 'Went Well / Improve / Actions',  icon: '🔄' },
  { id: 'mindmap',    name: 'Mind Map',      description: 'Central idea with branches',     icon: '🧠' },
  { id: 'brainstorm', name: 'Brainstorm',    description: 'Capture quick ideas and themes', icon: '💡' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default editable state per template
// ─────────────────────────────────────────────────────────────────────────────

interface KanbanState {
  selectedIds: string[];
  customLabel: string;
  customColor: string;
}

interface RetroState   { labels: [string, string, string] }
interface MindmapState { center: string; topics: string[] }
interface BrainstormState { ideas: string[] }

type EditState =
  | { kind: 'kanban';     kanban: KanbanState }
  | { kind: 'retro';      retro: RetroState }
  | { kind: 'mindmap';    mindmap: MindmapState }
  | { kind: 'brainstorm'; brainstorm: BrainstormState };

function defaultState(id: string): EditState | null {
  switch (id) {
    case 'kanban':
      return { kind: 'kanban', kanban: { selectedIds: ['todo', 'inprogress', 'done'], customLabel: '', customColor: '#6b7280' } };
    case 'retro':
      return { kind: 'retro', retro: { labels: ['😊 Went Well', '🔧 Improve', '🚀 Action Items'] } };
    case 'mindmap':
      return { kind: 'mindmap', mindmap: { center: 'Main Idea', topics: ['Topic A', 'Topic B', 'Topic C', 'Topic D'] } };
    case 'brainstorm':
      return { kind: 'brainstorm', brainstorm: { ideas: ['Idea 1', 'Idea 2', 'Idea 3', 'Idea 4'] } };
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny helpers
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <input
        className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-template editor panes
// ─────────────────────────────────────────────────────────────────────────────

function KanbanEditor({
  state, onChange,
}: { state: KanbanState; onChange: (s: KanbanState) => void }) {
  const toggle = (id: string) => {
    const next = state.selectedIds.includes(id)
      ? state.selectedIds.filter((x) => x !== id)
      : [...state.selectedIds, id];
    onChange({ ...state, selectedIds: next });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Select the columns to include (in order):</p>
      <div className="space-y-1.5">
        {KANBAN_COLUMN_OPTIONS.map((opt) => {
          const isCustom  = opt.id === 'custom';
          const checked   = isCustom
            ? state.selectedIds.includes('custom')
            : state.selectedIds.includes(opt.id);

          return (
            <div key={opt.id}>
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  className="accent-blue-500 w-4 h-4"
                  checked={checked}
                  onChange={() => toggle(opt.id)}
                />
                <span
                  className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: opt.fill }}
                />
                <span className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
                  {opt.label}
                </span>
              </label>

              {isCustom && checked && (
                <div className="ml-6 mt-1.5 space-y-1.5">
                  <Field
                    label="Column name"
                    value={state.customLabel}
                    onChange={(v) => onChange({ ...state, customLabel: v })}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Color</span>
                    <input
                      type="color"
                      value={state.customColor}
                      onChange={(e) => onChange({ ...state, customColor: e.target.value })}
                      className="w-7 h-6 rounded border border-gray-200 cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400">
        {state.selectedIds.length} column{state.selectedIds.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}

function RetroEditor({
  state, onChange,
}: { state: RetroState; onChange: (s: RetroState) => void }) {
  const update = (i: number, v: string) => {
    const next = [...state.labels] as [string, string, string];
    next[i] = v;
    onChange({ labels: next });
  };
  const placeholders = ['e.g. 😊 Went Well', 'e.g. 🔧 Improve', 'e.g. 🚀 Action Items'];
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Edit the three column headings:</p>
      {state.labels.map((lbl, i) => (
        <label key={i} className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Column {i + 1}
          </span>
          <input
            className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
            value={lbl}
            placeholder={placeholders[i]}
            onChange={(e) => update(i, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

function MindmapEditor({
  state, onChange,
}: { state: MindmapState; onChange: (s: MindmapState) => void }) {
  const updateTopic = (i: number, v: string) => {
    const next = [...state.topics];
    next[i] = v;
    onChange({ ...state, topics: next });
  };
  return (
    <div className="space-y-2">
      <Field label="Central idea" value={state.center} onChange={(v) => onChange({ ...state, center: v })} />
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">Branch topics</p>
      {state.topics.map((t, i) => (
        <input
          key={i}
          className="w-full border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
          value={t}
          placeholder={`Topic ${i + 1}`}
          onChange={(e) => updateTopic(i, e.target.value)}
        />
      ))}
    </div>
  );
}

function BrainstormEditor({
  state, onChange,
}: { state: BrainstormState; onChange: (s: BrainstormState) => void }) {
  const updateIdea = (i: number, v: string) => {
    const next = [...state.ideas];
    next[i] = v;
    onChange({ ...state, ideas: next });
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Name your four idea boxes:</p>
      {state.ideas.map((idea, i) => (
        <label key={i} className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Box {i + 1}
          </span>
          <input
            className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-400"
            value={idea}
            placeholder={`Idea ${i + 1}`}
            onChange={(e) => updateIdea(i, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  engineRef: React.MutableRefObject<CanvasEngine | null>;
}

export default function TemplatesPanel({ engineRef }: Props) {
  const [open, setOpen]           = useState(false);
  const [picked, setPicked]       = useState<Template | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  function selectTemplate(t: Template) {
    if (t.id === 'blank') {
      if (!confirm('Clear the canvas and start from blank?')) return;
      engineRef.current?.clearCanvas();
      toast.success('Blank canvas applied');
      close();
      return;
    }
    setPicked(t);
    setEditState(defaultState(t.id));
  }

  async function applyFinal(t: Template, es: EditState | null) {
    if (!engineRef.current) return;
    const confirmed = confirm(`Replace current canvas with "${t.name}" template?`);
    if (!confirmed) return;

    // Clear canvas first so remote collaborators also see a reset
    engineRef.current.clearCanvas();

    let json: object;
    switch (es?.kind) {
      case 'kanban': {
        const { selectedIds, customLabel, customColor } = es.kanban;
        const columns = KANBAN_COLUMN_OPTIONS
          .filter((o) => selectedIds.includes(o.id))
          .map((o) =>
            o.id === 'custom'
              ? { label: customLabel || 'Custom', fill: customColor }
              : { label: o.label, fill: o.fill },
          );
        if (columns.length === 0) {
          toast.error('Select at least one column');
          return;
        }
        json = buildKanbanJSON(columns);
        break;
      }
      case 'retro':
        json = buildRetroJSON(es.retro.labels);
        break;
      case 'mindmap':
        json = buildMindMapJSON(es.mindmap.center, es.mindmap.topics);
        break;
      case 'brainstorm':
        json = buildBrainstormJSON(es.brainstorm.ideas);
        break;
      default:
        json = { version: '5.3.0', objects: [] };
    }

    // silent=true so the template objects are NOT re-broadcast as 'add'
    // operations. Without it, each object (which has no id) triggers
    // object:added → emitAdd → server echo → applyRemoteOperation → re-add,
    // causing a feedback loop that makes the cursor/pencil/laser appear to
    // continuously move as the mouse moves.
    await engineRef.current.loadFromJSON(JSON.stringify(json), true);
    toast.success(`"${t.name}" template loaded`);
    close();
  }

  function close() {
    setOpen(false);
    setPicked(null);
    setEditState(null);
  }

  return (
    <div className="relative">
      <button
        className="btn-ghost text-sm"
        onClick={() => { setOpen((p) => !p); setPicked(null); setEditState(null); }}
        title="Board templates"
      >
        🎨 Templates
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={close} />

          <div
            className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
            style={{ width: picked ? 320 : 264 }}
          >
            {/* ── Template picker ── */}
            {!picked && (
              <div className="p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Start from a template
                </p>
                <div className="space-y-1">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-xl">{t.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.description}</p>
                      </div>
                      {t.id !== 'blank' && (
                        <span className="ml-auto text-gray-300 text-xs">✎</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Editor pane ── */}
            {picked && editState && (
              <div className="flex flex-col" style={{ maxHeight: 520 }}>
                {/* header */}
                <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-gray-100">
                  <button
                    onClick={() => { setPicked(null); setEditState(null); }}
                    className="text-gray-400 hover:text-gray-700 text-lg leading-none"
                    title="Back"
                  >
                    ←
                  </button>
                  <span className="text-base">{picked.icon}</span>
                  <p className="text-sm font-semibold text-gray-800">{picked.name}</p>
                </div>

                {/* scrollable body */}
                <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1">
                  {editState.kind === 'kanban' && (
                    <KanbanEditor
                      state={editState.kanban}
                      onChange={(s) => setEditState({ kind: 'kanban', kanban: s })}
                    />
                  )}
                  {editState.kind === 'retro' && (
                    <RetroEditor
                      state={editState.retro}
                      onChange={(s) => setEditState({ kind: 'retro', retro: s })}
                    />
                  )}
                  {editState.kind === 'mindmap' && (
                    <MindmapEditor
                      state={editState.mindmap}
                      onChange={(s) => setEditState({ kind: 'mindmap', mindmap: s })}
                    />
                  )}
                  {editState.kind === 'brainstorm' && (
                    <BrainstormEditor
                      state={editState.brainstorm}
                      onChange={(s) => setEditState({ kind: 'brainstorm', brainstorm: s })}
                    />
                  )}
                </div>

                {/* footer */}
                <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => { setPicked(null); setEditState(null); }}
                    className="flex-1 rounded-lg border border-gray-200 text-sm text-gray-600 py-2 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => applyFinal(picked, editState)}
                    className="flex-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 transition-colors"
                  >
                    Apply Template
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
