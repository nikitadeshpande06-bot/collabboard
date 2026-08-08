/**
 * RoleSelectorPage — Landing page
 * Dark theme matching the NoteIT-style design in the screenshot.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RoleSelectorPage() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(true);

  const bg     = dark ? '#0f1117' : '#f8fafc';
  const card   = dark ? '#161b27' : '#ffffff';
  const border = dark ? '#1e2535' : '#e5e7eb';
  const text   = dark ? '#e8eaf6' : '#1f2328';
  const muted  = dark ? '#8892a4' : '#57606a';
  const accent = '#4f6ef7';
  const accentHover = '#3b5be0';

  return (
    <div style={{ fontFamily: '-apple-system,"Segoe UI",system-ui,sans-serif', background: bg, color: text, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: dark ? 'rgba(15,17,23,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill={accent} />
              <path d="M8 24V10l8 8 8-8v14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px', color: text }}>CollabBoard</span>
          </div>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="hide-mobile">
            {[
              { label: 'Home',         id: 'home' },
              { label: 'Features',     id: 'features' },
              { label: 'How It Works', id: 'how-it-works' },
              { label: 'Support',      id: 'support' },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                style={{ fontSize: 14, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setDark((d) => !d)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: muted, padding: '6px 8px', borderRadius: 8 }}
              title="Toggle theme"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{ fontSize: 14, fontWeight: 500, color: text, background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 18px', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = border)}
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: accent, border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = accent)}
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section id="home" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Background blobs */}
        <div style={{ position: 'absolute', top: 60, right: -80, width: 420, height: 420, borderRadius: '50%', background: dark ? 'rgba(79,110,247,0.12)' : 'rgba(79,110,247,0.07)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 180, right: 60, width: 260, height: 260, borderRadius: '50%', border: `1px solid ${dark ? 'rgba(79,110,247,0.25)' : 'rgba(79,110,247,0.15)'}`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 100, left: 40, width: 140, height: 140, borderRadius: '50%', background: dark ? 'rgba(30,37,53,0.8)' : 'rgba(79,110,247,0.06)', border: `1px solid ${border}`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 60, left: 0, width: 300, height: 200, pointerEvents: 'none', opacity: 0.3 }}>
          <svg viewBox="0 0 300 200" fill="none">
            <path d="M0 150 Q75 80 150 120 Q225 160 300 80" stroke={accent} strokeWidth="1" fill="none" opacity="0.6" />
            <path d="M0 180 Q75 110 150 150 Q225 190 300 110" stroke={accent} strokeWidth="0.8" fill="none" opacity="0.4" />
          </svg>
        </div>

        <div style={{ position: 'relative', maxWidth: 700 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: dark ? 'rgba(79,110,247,0.12)' : 'rgba(79,110,247,0.08)', border: `1px solid rgba(79,110,247,0.3)`, borderRadius: 999, padding: '6px 16px', fontSize: 12, fontWeight: 600, color: accent, marginBottom: 28, letterSpacing: '0.05em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'inline-block' }} />
            NOW IN PUBLIC BETA
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1px', margin: '0 0 24px', color: text }}>
            Collaborate and create with our{' '}
            <span style={{ color: accent }}>whiteboard software</span>
          </h1>

          <p style={{ fontSize: 18, color: muted, lineHeight: 1.7, margin: '0 0 40px', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            Experience Real-Time Collaboration with Multiple Users on Our Whiteboard Software. Draw, plan, and build ideas together — instantly.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/register')}
              style={{ fontSize: 16, fontWeight: 700, color: '#fff', background: accent, border: 'none', borderRadius: 10, padding: '14px 36px', cursor: 'pointer', transition: 'background 0.15s, transform 0.1s', boxShadow: '0 4px 24px rgba(79,110,247,0.35)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = accentHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = accent; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Get started →
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{ fontSize: 16, fontWeight: 600, color: text, background: 'none', border: `1px solid ${border}`, borderRadius: 10, padding: '14px 36px', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = border)}
            >
              Sign in
            </button>
          </div>

          {/* Social proof */}
          <p style={{ marginTop: 36, fontSize: 13, color: muted }}>
            ✨ Free to use &nbsp;·&nbsp; 🔒 Secure &nbsp;·&nbsp; ⚡ Real-time sync
          </p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 24px', background: dark ? '#0d1118' : '#f1f5f9' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: accent, textTransform: 'uppercase', marginBottom: 12 }}>FEATURES</p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, color: text, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            Everything you need to collaborate
          </h2>
          <p style={{ textAlign: 'center', color: muted, fontSize: 16, marginBottom: 56, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            A complete toolkit built for teams — from sketching ideas to presenting live.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} dark={dark} card={card} border={border} text={text} muted={muted} accent={accent} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: bg }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: accent, textTransform: 'uppercase', marginBottom: 12 }}>HOW IT WORKS</p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, color: text, margin: '0 0 56px', letterSpacing: '-0.5px' }}>
            Up and running in 3 steps
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {STEPS.map((s, i) => (
              <div key={s.title} style={{ textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: `rgba(79,110,247,0.12)`, border: `2px solid rgba(79,110,247,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 20px' }}>
                  {i + 1}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 17, color: text, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: muted, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tools showcase ───────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: dark ? '#0d1118' : '#f1f5f9' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: accent, textTransform: 'uppercase', marginBottom: 12 }}>TOOLS</p>
            <h2 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 800, color: text, margin: '0 0 20px', lineHeight: 1.2 }}>
              A full creative toolkit at your fingertips
            </h2>
            <p style={{ color: muted, fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
              Pencil, shapes, sticky notes, text, laser pointer, voice-to-text, comment pins, PDF export, playback recorder and more — all in one canvas.
            </p>
            <button
              onClick={() => navigate('/register')}
              style={{ fontSize: 15, fontWeight: 700, color: '#fff', background: accent, border: 'none', borderRadius: 10, padding: '12px 28px', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = accent)}
            >
              Try it free →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {TOOLS.map((t) => (
              <div key={t.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: text }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section id="support" style={{ padding: '80px 24px', textAlign: 'center', background: bg }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, color: text, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            Ready to start collaborating?
          </h2>
          <p style={{ color: muted, fontSize: 16, marginBottom: 36, lineHeight: 1.7 }}>
            Join thousands of teams who use CollabBoard to brainstorm, plan, and create together in real time.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/register')}
              style={{ fontSize: 16, fontWeight: 700, color: '#fff', background: accent, border: 'none', borderRadius: 10, padding: '14px 36px', cursor: 'pointer', boxShadow: '0 4px 24px rgba(79,110,247,0.35)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = accent)}
            >
              Create free account
            </button>
            <button
              onClick={() => navigate('/login?role=admin')}
              style={{ fontSize: 16, fontWeight: 600, color: text, background: 'none', border: `1px solid ${border}`, borderRadius: 10, padding: '14px 36px', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = border)}
            >
              🛡️ Admin access
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${border}`, padding: '32px 24px', background: dark ? '#0a0c12' : '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill={accent} />
              <path d="M8 24V10l8 8 8-8v14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 15, color: text }}>CollabBoard</span>
          </div>
          <p style={{ fontSize: 13, color: muted, margin: 0 }}>
            © {new Date().getFullYear()} CollabBoard. Real-time collaborative whiteboard.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms', 'Support'].map((l) => (
              <button
                key={l}
                onClick={() => document.getElementById('support')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ fontSize: 13, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Mobile hide helper ───────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 640px) { .hide-mobile { display: none !important; } }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '⚡', title: 'Real-time sync',       desc: 'Every stroke, shape and sticky note syncs across all connected users in under 50 ms via WebSockets.' },
  { icon: '🖊️', title: 'Rich drawing tools',   desc: 'Pencil, highlighter, shapes, text, sticky notes, eraser — everything a physical whiteboard has, and more.' },
  { icon: '👥', title: 'Live cursors',          desc: 'See every collaborator\'s cursor and name tag moving in real time on the shared canvas.' },
  { icon: '💬', title: 'Room chat',             desc: 'Built-in chat sidebar keeps conversations tied to each board without switching apps.' },
  { icon: '📌', title: 'Comment pins',          desc: 'Anchor threaded comments to any position on the canvas and sync them live across all users.' },
  { icon: '🎤', title: 'Voice to text',         desc: 'Dictate text directly onto the canvas in 36 languages using the Web Speech API.' },
  { icon: '📄', title: 'PDF & image export',    desc: 'Export your board as a high-resolution PNG or a multi-page PDF with one click.' },
  { icon: '⏪', title: 'Drawing playback',      desc: 'Record every stroke and replay the entire session at 0.5×, 1×, 2× or 4× speed.' },
  { icon: '🌙', title: 'Dark mode',             desc: 'Full dark / light mode support, system-aware, with a single toggle.' },
];

const STEPS = [
  { title: 'Create an account',  desc: 'Sign up for free in seconds. No credit card required.' },
  { title: 'Create a board',     desc: 'Name your board and invite collaborators via a shareable link.' },
  { title: 'Collaborate live',   desc: 'Start drawing. Everyone sees changes the instant they happen.' },
];

const TOOLS = [
  { icon: '✏️', label: 'Pencil & eraser' },
  { icon: '🔷', label: 'Shapes' },
  { icon: '🗒️', label: 'Sticky notes' },
  { icon: 'T',  label: 'Text & fonts' },
  { icon: '🔴', label: 'Laser pointer' },
  { icon: '↩️', label: 'Undo / Redo' },
  { icon: '📋', label: 'Cut / Copy / Paste' },
  { icon: '📐', label: 'Templates' },
];

// ── FeatureCard ───────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc, dark, card, border, text, muted, accent }: {
  icon: string; title: string; desc: string;
  dark: boolean; card: string; border: string; text: string; muted: string; accent: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: card,
        border: `1px solid ${hovered ? accent : border}`,
        borderRadius: 16,
        padding: '28px 24px',
        transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.15s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `0 8px 32px rgba(79,110,247,0.12)` : 'none',
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
      <h3 style={{ fontWeight: 700, fontSize: 16, color: text, marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: 14, color: muted, lineHeight: 1.65, margin: 0 }}>{desc}</p>
    </div>
  );
}
