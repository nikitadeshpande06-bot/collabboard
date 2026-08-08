import { useState } from 'react';
import toast from 'react-hot-toast';
import type { CanvasEngine } from '@/canvas/CanvasEngine';

interface Template {
  id:          string;
  name:        string;
  description: string;
  icon:        string;
  json:        object;
}

// ── Template JSON definitions ─────────────────────────────────────────────────

const KANBAN_JSON = {
  version: '5.3.0',
  objects: [
    // Column header backgrounds
    ...['#3b82f6', '#f97316', '#22c55e'].flatMap((fill, i) => {
      const left = 40 + i * 220;
      return [
        { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
          left, top: 40, width: 195, height: 44, fill, rx: 8, ry: 8,
          stroke: 'transparent', strokeWidth: 0 },
        { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
          left: left + 12, top: 53,
          text: ['📋 To Do', '⚡ In Progress', '✅ Done'][i],
          fontSize: 13, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Arial' },
      ];
    }),
    // Sample cards
    ...([
      { text: 'Design UI mockups', left: 40,  top: 110 },
      { text: 'Write test cases',  left: 40,  top: 172 },
      { text: 'Build auth API',    left: 260, top: 110 },
      { text: 'Deploy to staging', left: 480, top: 110 },
    ] as { text: string; left: number; top: number }[]).flatMap(({ text, left, top }) => [
      { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
        left, top, width: 195, height: 52,
        fill: '#f7f8fa', stroke: '#e5e7eb', strokeWidth: 1, rx: 6, ry: 6 },
      { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
        left: left + 10, top: top + 16,
        text, fontSize: 12, fill: '#1f2328', fontFamily: 'Arial' },
    ]),
  ],
};

const RETRO_JSON = {
  version: '5.3.0',
  objects: [
    ...(['#22c55e', '#f97316', '#3b82f6'] as string[]).flatMap((fill, i) => {
      const left = 40 + i * 240;
      const labels = ['😊 Went Well', '🔧 Improve', '🚀 Action Items'];
      return [
        { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
          left, top: 30, width: 210, height: 50,
          fill, rx: 10, ry: 10, stroke: 'transparent', strokeWidth: 0 },
        { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
          left: left + 14, top: 46,
          text: labels[i], fontSize: 14, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Arial' },
        { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
          left, top: 100, width: 210, height: 80,
          fill: '#fef08a', stroke: '#ca8a04', strokeWidth: 1, rx: 4, ry: 4 },
        { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
          left: left + 10, top: 118,
          text: 'Click to edit…', fontSize: 12, fill: '#713f12', fontFamily: 'Arial' },
      ];
    }),
  ],
};

const MINDMAP_JSON = {
  version: '5.3.0',
  objects: [
    { type: 'ellipse', version: '5.3.0', originX: 'left', originY: 'top',
      left: 280, top: 180, rx: 80, ry: 40,
      fill: '#3b82f6', stroke: '#1d4ed8', strokeWidth: 2 },
    { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
      left: 310, top: 208, text: 'Main Idea',
      fontSize: 15, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Arial' },
    ...[
      { text: 'Topic A', left: 60,  top: 80  },
      { text: 'Topic B', left: 520, top: 80  },
      { text: 'Topic C', left: 60,  top: 300 },
      { text: 'Topic D', left: 520, top: 300 },
    ].flatMap(({ text, left, top }) => [
      { type: 'ellipse', version: '5.3.0', originX: 'left', originY: 'top',
        left, top, rx: 60, ry: 28,
        fill: '#eff6ff', stroke: '#3b82f6', strokeWidth: 1.5 },
      { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
        left: left + 20, top: top + 12,
        text, fontSize: 13, fill: '#1d4ed8', fontFamily: 'Arial' },
    ]),
  ],
};

const BRAINSTORM_JSON = {
  version: '5.3.0',
  objects: [
    { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
      left: 40, top: 40, width: 220, height: 90, fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 2, rx: 12, ry: 12 },
    { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
      left: 52, top: 62, text: 'Idea 1', fontSize: 14, fontWeight: 'bold', fill: '#92400e', fontFamily: 'Arial' },
    { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
      left: 320, top: 40, width: 220, height: 90, fill: '#dbeafe', stroke: '#3b82f6', strokeWidth: 2, rx: 12, ry: 12 },
    { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
      left: 332, top: 62, text: 'Idea 2', fontSize: 14, fontWeight: 'bold', fill: '#1d4ed8', fontFamily: 'Arial' },
    { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
      left: 40, top: 170, width: 220, height: 90, fill: '#dcfce7', stroke: '#16a34a', strokeWidth: 2, rx: 12, ry: 12 },
    { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
      left: 52, top: 192, text: 'Idea 3', fontSize: 14, fontWeight: 'bold', fill: '#166534', fontFamily: 'Arial' },
    { type: 'rect', version: '5.3.0', originX: 'left', originY: 'top',
      left: 320, top: 170, width: 220, height: 90, fill: '#ede9fe', stroke: '#7c3aed', strokeWidth: 2, rx: 12, ry: 12 },
    { type: 'i-text', version: '5.3.0', originX: 'left', originY: 'top',
      left: 332, top: 192, text: 'Idea 4', fontSize: 14, fontWeight: 'bold', fill: '#5b21b6', fontFamily: 'Arial' },
  ],
};

export const TEMPLATES: Template[] = [
  { id: 'blank',    name: 'Blank Canvas',    description: 'Start from scratch',        icon: '⬜', json: { version: '5.3.0', objects: [] } },
  { id: 'kanban',   name: 'Kanban Board',    description: 'To Do / In Progress / Done', icon: '📋', json: KANBAN_JSON },
  { id: 'retro',    name: 'Retrospective',   description: 'Went Well / Improve / Actions', icon: '🔄', json: RETRO_JSON },
  { id: 'mindmap',  name: 'Mind Map',        description: 'Central idea with branches', icon: '🧠', json: MINDMAP_JSON },
  { id: 'brainstorm', name: 'Brainstorm',    description: 'Capture quick ideas and themes', icon: '💡', json: BRAINSTORM_JSON },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  engineRef: React.MutableRefObject<CanvasEngine | null>;
}

export default function TemplatesPanel({ engineRef }: Props) {
  const [open, setOpen] = useState(false);

  async function applyTemplate(t: Template) {
    if (!engineRef.current) return;
    if (t.id !== 'blank') {
      const confirmed = confirm(`Replace current canvas with "${t.name}" template?`);
      if (!confirmed) return;
    }
    await engineRef.current.loadFromJSON(JSON.stringify(t.json));
    toast.success(`"${t.name}" template loaded`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        className="btn-ghost text-sm"
        onClick={() => setOpen((p) => !p)}
        title="Board templates"
      >
        🎨 Templates
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-50 w-64">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Start from a template
            </p>
            <div className="space-y-1">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
