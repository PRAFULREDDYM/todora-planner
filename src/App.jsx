import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ══════════════════════════════════════════
   DESIGN TOKENS — monochrome + warm amber
══════════════════════════════════════════ */
const C = {
  bg: "#0A0A0A",
  surface: "#111111",
  surfaceUp: "#181818",
  surfaceHi: "#222222",
  border: "rgba(255,255,255,0.06)",
  borderMid: "rgba(255,255,255,0.1)",
  borderHi: "rgba(255,255,255,0.16)",
  accent: "#E8D5A3",       // warm gold/cream
  accentDim: "rgba(232,213,163,0.12)",
  accentGlow: "rgba(232,213,163,0.25)",
  success: "#4ADE80",
  danger: "#F87171",
  warn: "#FB923C",
  text: "#F5F3EE",
  textMid: "#8A8880",
  textDim: "#3D3C3A",
  white: "#FFFFFF",
};

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
const todayStr = () => new Date().toISOString().split("T")[0];
const fmtDate = (s) => new Date(s + "T12:00:00");
const fmtMs = (ms) => {
  if (!ms || ms < 500) return null;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60 > 0 ? s % 60 + "s" : ""}`.trim();
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const fmtLive = (ms) => {
  if (!ms) return "00:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${pad(h)}:${pad(m % 60)}:${pad(s % 60)}`;
  return `${pad(m)}:${pad(s % 60)}`;
};
const pad = (n) => String(n).padStart(2, "0");
const fmtGoal = (min) => min >= 60 ? `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}m` : ""}` : `${min}m`;

const MONTHS_S = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_F = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_S = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const STORE = "momentum_v5";

function calcStreak(history) {
  let s = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    const k = d.toISOString().split("T")[0];
    if ((history[k] || []).length > 0) { s++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return s;
}

/* ══════════════════════════════════════════
   ANIMATED BACKGROUND
══════════════════════════════════════════ */
function Background() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf, st = null;
    const loop = (ts) => { if (!st) st = ts; setT((ts - st) / 12000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const s = Math.sin(t * Math.PI * 2);
  const c = Math.cos(t * Math.PI * 2);
  const s2 = Math.sin(t * Math.PI * 2 + 1.8);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="rg1" cx={`${44 + s * 14}%`} cy={`${28 + c * 12}%`} r="42%">
            <stop offset="0%" stopColor="#3D3520" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3D3520" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rg2" cx={`${68 + c * 12}%`} cy={`${62 + s2 * 16}%`} r="36%">
            <stop offset="0%" stopColor="#1A2A1A" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1A2A1A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rg3" cx={`${22 + s2 * 10}%`} cy={`${78 + s * 10}%`} r="30%">
            <stop offset="0%" stopColor="#1F1810" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1F1810" stopOpacity="0" />
          </radialGradient>
          <filter id="nz">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <pattern id="gr" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0L0 0 0 40" fill="none" stroke="rgba(255,255,255,0.018)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#0A0A0A" />
        <rect width="100%" height="100%" fill="url(#rg1)" />
        <rect width="100%" height="100%" fill="url(#rg2)" />
        <rect width="100%" height="100%" fill="url(#rg3)" />
        <rect width="100%" height="100%" fill="url(#gr)" />
        <rect width="100%" height="100%" filter="url(#nz)" opacity="0.03" />
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════
   LOGO
══════════════════════════════════════════ */
function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" fill={C.surfaceHi} />
        <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" stroke={C.borderMid} />
        {/* M letterform */}
        <path d="M7 20V8L14 15L21 8V20" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* accent dot */}
        <circle cx="14" cy="15" r="1.4" fill={C.accent} />
      </svg>
      <span style={{
        fontSize: 15, fontWeight: 700, letterSpacing: -0.3,
        color: C.text, fontFamily: "'Instrument Serif',Georgia,serif",
        fontStyle: "italic",
      }}>Momentum</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   FLOATING NAV
══════════════════════════════════════════ */
function FloatingNav({ tab, setTab }) {
  const tabs = [
    {
      id: "today", label: "Today", icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M2 7h12" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )
    },
    {
      id: "history", label: "History", icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 5v3.5L10.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: "progress", label: "Stats", icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 12L6 8l3 2.5L14 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 50,
      background: "rgba(17,17,17,0.88)",
      backdropFilter: "blur(24px)",
      border: `1px solid ${C.borderMid}`,
      borderRadius: 100,
      padding: "6px 6px",
      display: "flex", gap: 2,
      boxShadow: "0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: tab === t.id ? "8px 18px" : "8px 14px",
          borderRadius: 100, border: "none", cursor: "pointer",
          background: tab === t.id ? C.surfaceHi : "transparent",
          color: tab === t.id ? C.text : C.textMid,
          fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
          fontFamily: "inherit", transition: "all 0.25s cubic-bezier(.34,1.56,.64,1)",
          boxShadow: tab === t.id ? "0 2px 12px rgba(0,0,0,0.4)" : "none",
          letterSpacing: 0.2,
        }}>
          <span style={{ transition: "all 0.25s", color: tab === t.id ? C.accent : "currentColor" }}>
            {t.icon}
          </span>
          <span style={{
            maxWidth: tab === t.id ? 60 : 0,
            overflow: "hidden", whiteSpace: "nowrap",
            transition: "max-width 0.3s ease, opacity 0.2s ease",
            opacity: tab === t.id ? 1 : 0,
          }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   ADD / EDIT TASK SHEET
══════════════════════════════════════════ */
const GOAL_OPTS = [
  { label: "None", min: 0 },
  { label: "15m", min: 15 },
  { label: "30m", min: 30 },
  { label: "45m", min: 45 },
  { label: "1h", min: 60 },
  { label: "1.5h", min: 90 },
  { label: "2h", min: 120 },
  { label: "3h", min: 180 },
  { label: "4h", min: 240 },
];

function TaskSheet({ task, onSave, onClose }) {
  const isEdit = !!task?.id;
  const [name, setName] = useState(task?.name || "");
  const [description, setDescription] = useState(task?.description || "");
  const [recurrence, setRecurrence] = useState(task?.recurrence || "once"); // "once" | "daily" | "weekdays" | "weekends" | "weekly"
  const [goalMin, setGoalMin] = useState(task?.goalMin ?? 0);
  const [show, setShow] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setShow(true)); }, []);

  const close = () => { setShow(false); setTimeout(onClose, 360); };
  const submit = () => {
    if (!name.trim()) return;
    onSave({
      id: task?.id || Date.now(),
      name: name.trim(),
      description: description.trim(),
      recurrence,
      goalMin,
    });
    close();
  };

  const RECUR_OPTS = [
    { id: "once", label: "Once" },
    { id: "daily", label: "Every day" },
    { id: "weekdays", label: "Weekdays" },
    { id: "weekends", label: "Weekends" },
    { id: "weekly", label: "Weekly" },
  ];

  const inputStyle = {
    width: "100%", background: C.surfaceUp,
    border: `1px solid ${C.border}`, borderRadius: 12,
    padding: "13px 16px", color: C.text,
    fontFamily: "inherit", fontSize: 14, outline: "none",
    boxSizing: "border-box", resize: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      <div onClick={close} style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
        opacity: show ? 1 : 0, transition: "opacity 0.35s ease",
      }} />
      <div style={{
        position: "relative", zIndex: 1,
        background: C.surface,
        borderRadius: "24px 24px 0 0",
        border: `1px solid ${C.borderMid}`,
        borderBottom: "none",
        maxHeight: "90vh", overflowY: "auto",
        transform: show ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.4s cubic-bezier(.32,.72,0,1)",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 0" }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: C.border }} />
        </div>

        <div style={{ padding: "20px 22px 48px" }}>
          {/* Title */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>
              {isEdit ? "Edit Task" : "New Task"}
            </h2>
            <button onClick={close} style={{
              background: "none", border: `1px solid ${C.border}`,
              borderRadius: 8, width: 32, height: 32, cursor: "pointer",
              color: C.textMid, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: C.textMid, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 7 }}>
              Task Name *
            </label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="e.g. Deep work session"
              autoFocus
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.borderHi}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: C.textMid, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 7 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional notes or context..."
              rows={3}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.borderHi}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          {/* Recurrence */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: C.textMid, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              Recurrence
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {RECUR_OPTS.map(opt => (
                <button key={opt.id} onClick={() => setRecurrence(opt.id)} style={{
                  padding: "8px 16px", borderRadius: 100,
                  border: `1px solid ${recurrence === opt.id ? C.accent : C.border}`,
                  background: recurrence === opt.id ? C.accentDim : "transparent",
                  color: recurrence === opt.id ? C.accent : C.textMid,
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  fontWeight: recurrence === opt.id ? 600 : 400,
                  transition: "all 0.18s ease",
                }}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Goal time */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 11, color: C.textMid, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              Goal Time <span style={{ color: C.textDim, textTransform: "none", letterSpacing: 0, fontStyle: "italic", fontSize: 10 }}>(task can exceed this)</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {GOAL_OPTS.map(opt => (
                <button key={opt.min} onClick={() => setGoalMin(opt.min)} style={{
                  padding: "8px 14px", borderRadius: 100,
                  border: `1px solid ${goalMin === opt.min ? C.accent : C.border}`,
                  background: goalMin === opt.min ? C.accentDim : "transparent",
                  color: goalMin === opt.min ? C.accent : C.textMid,
                  fontSize: 12, cursor: "pointer",
                  fontWeight: goalMin === opt.min ? 600 : 400,
                  transition: "all 0.18s ease",
                  fontFamily: "'DM Mono',monospace",
                }}>{opt.label}</button>
              ))}
            </div>
            {goalMin > 0 && (
              <p style={{ fontSize: 12, color: C.textDim, marginTop: 8, fontStyle: "italic" }}>
                Timer will highlight when you reach {fmtGoal(goalMin)} — you can keep going beyond that.
              </p>
            )}
          </div>

          <button
            onClick={submit}
            style={{
              width: "100%", padding: "15px",
              background: name.trim() ? C.surfaceHi : C.surfaceUp,
              border: `1px solid ${name.trim() ? C.borderHi : C.border}`,
              borderRadius: 14, color: name.trim() ? C.text : C.textDim,
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", transition: "all 0.2s ease",
              letterSpacing: 0.3,
            }}
          >
            {isEdit ? "Save Changes" : "Create Task"} →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   TASK CARD
══════════════════════════════════════════ */
function TaskCard({ task, entry, isRunning, elapsed, onToggle, onDelete, onEdit, onStart, onStop }) {
  const [expanded, setExpanded] = useState(false);
  const [pressed, setPressed] = useState(false);
  const isDone = !!entry;
  const goalMs = task.goalMin * 60 * 1000;
  const liveMs = isRunning ? elapsed : (entry ? entry.completedAt - entry.startedAt : 0);
  const exceededGoal = goalMs > 0 && liveMs > goalMs;
  const goalPct = goalMs > 0 ? Math.min(liveMs / goalMs, 1) : 0;

  const recurrenceBadge = {
    once: { label: "One-time", sym: "○" },
    daily: { label: "Daily", sym: "↺" },
    weekdays: { label: "Weekdays", sym: "M–F" },
    weekends: { label: "Weekends", sym: "S–S" },
    weekly: { label: "Weekly", sym: "⟳" },
  }[task.recurrence] || { label: "", sym: "" };

  return (
    <div style={{
      background: isDone ? "rgba(74,222,128,0.04)" : C.surface,
      border: `1px solid ${isDone ? "rgba(74,222,128,0.15)" : C.border}`,
      borderRadius: 16, marginBottom: 8,
      transition: "all 0.3s ease",
      transform: pressed ? "scale(0.99)" : "scale(1)",
      boxShadow: pressed ? "0 2px 16px rgba(0,0,0,0.4)" : "none",
      overflow: "hidden",
    }}>
      {/* Goal time progress bar (top) */}
      {goalMs > 0 && (isRunning || isDone) && (
        <div style={{ height: 2, background: C.surfaceHi }}>
          <div style={{
            height: "100%",
            width: `${goalPct * 100}%`,
            background: exceededGoal ? C.warn : C.success,
            transition: "width 0.5s ease",
            boxShadow: exceededGoal ? `0 0 8px ${C.warn}` : `0 0 6px ${C.success}`,
          }} />
        </div>
      )}

      <div
        style={{ padding: "14px 16px", cursor: "pointer" }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onClick={() => setExpanded(p => !p)}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {/* Check button */}
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              border: `1.5px solid ${isDone ? "transparent" : C.borderMid}`,
              background: isDone ? C.success : "transparent",
              cursor: "pointer", marginTop: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.3s cubic-bezier(.34,1.56,.64,1)",
              boxShadow: isDone ? `0 0 12px rgba(74,222,128,0.3)` : "none",
            }}>
            {isDone && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L3.5 7L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 14, fontWeight: 500,
                color: isDone ? C.textMid : C.text,
                textDecoration: isDone ? "line-through" : "none",
                textDecorationColor: C.textDim,
                transition: "all 0.25s",
              }}>{task.name}</span>
              {/* Recurrence chip */}
              <span style={{
                fontSize: 10, color: C.textDim,
                border: `1px solid ${C.border}`, borderRadius: 100,
                padding: "1px 7px", fontFamily: "'DM Mono',monospace",
                letterSpacing: 0.3, flexShrink: 0,
              }}>{recurrenceBadge.sym} {recurrenceBadge.label}</span>
            </div>
            {/* Goal time indicator */}
            {task.goalMin > 0 && (
              <div style={{ fontSize: 11, color: exceededGoal ? C.warn : C.textDim, marginTop: 3, fontFamily: "'DM Mono',monospace" }}>
                {exceededGoal ? `⏱ ${fmtLive(liveMs)} / goal ${fmtGoal(task.goalMin)} exceeded` :
                  isRunning ? `⏱ ${fmtLive(liveMs)} / ${fmtGoal(task.goalMin)}` :
                    isDone ? `✓ ${fmtMs(liveMs) || "—"}` :
                      `Goal: ${fmtGoal(task.goalMin)}`}
              </div>
            )}
            {!task.goalMin && (isRunning || isDone) && (
              <div style={{ fontSize: 11, color: isRunning ? C.accent : C.textDim, marginTop: 3, fontFamily: "'DM Mono',monospace" }}>
                {isRunning ? `⏱ ${fmtLive(elapsed)}` : isDone && fmtMs(entry.completedAt - entry.startedAt) ? `✓ ${fmtMs(entry.completedAt - entry.startedAt)}` : ""}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {!isDone && (
              <button
                onClick={e => { e.stopPropagation(); isRunning ? onStop() : onStart(); }}
                style={{
                  padding: "5px 10px", borderRadius: 8,
                  border: `1px solid ${isRunning ? "rgba(248,113,113,0.4)" : C.borderMid}`,
                  background: isRunning ? "rgba(248,113,113,0.08)" : C.surfaceUp,
                  color: isRunning ? C.danger : C.textMid,
                  fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono',monospace",
                  fontWeight: 500, transition: "all 0.2s", whiteSpace: "nowrap",
                }}>{isRunning ? "■ Stop" : "▶ Start"}</button>
            )}
            <button
              onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
              style={{
                background: "none", border: "none",
                color: C.textDim, cursor: "pointer",
                fontSize: 13, padding: "4px 6px",
                transition: "transform 0.25s",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}>⌄</button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <div style={{
        maxHeight: expanded ? 200 : 0,
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0,1,0,1)",
        ...(expanded ? { transition: "max-height 0.4s ease-in-out" } : {}),
      }}>
        <div style={{
          padding: "0 16px 14px",
          borderTop: `1px solid ${C.border}`,
          paddingTop: 14,
        }}>
          {task.description && (
            <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, marginBottom: 12 }}>
              {task.description}
            </p>
          )}
          {!task.description && (
            <p style={{ fontSize: 12, color: C.textDim, fontStyle: "italic", marginBottom: 12 }}>No description</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.surfaceUp,
                color: C.textMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.18s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}
            >Edit</button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(248,113,113,0.15)",
                background: "rgba(248,113,113,0.05)",
                color: C.danger, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.18s", opacity: 0.7,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "1"}
              onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
            >Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   HOME SCREEN
══════════════════════════════════════════ */
function HomeScreen({ tasks, history, timers, liveTime, onToggle, onDelete, onEdit, onAdd, onStart, onStop }) {
  const [showSheet, setShowSheet] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const today = todayStr();
  const todayEntries = history[today] || [];
  const completedIds = todayEntries.map(e => e.id);
  const streak = calcStreak(history);
  const dayOfWeek = new Date().getDay();

  // Filter tasks visible today based on recurrence
  const visibleTasks = tasks.filter(t => {
    if (t.recurrence === "once") return true;
    if (t.recurrence === "daily") return true;
    if (t.recurrence === "weekdays") return dayOfWeek >= 1 && dayOfWeek <= 5;
    if (t.recurrence === "weekends") return dayOfWeek === 0 || dayOfWeek === 6;
    if (t.recurrence === "weekly") return true; // show always for simplicity
    return true;
  });

  const doneCnt = visibleTasks.filter(t => completedIds.includes(t.id)).length;
  const totalCnt = visibleTasks.length;
  const pct = totalCnt > 0 ? Math.round((doneCnt / totalCnt) * 100) : 0;

  const handleEdit = (task) => { setEditTask(task); setShowSheet(true); };
  const handleSave = (taskData) => {
    onEdit(taskData);
    setEditTask(null);
  };

  return (
    <div>
      {/* Date & streak row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11, color: C.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.1,
            color: C.text, letterSpacing: -0.5,
            fontFamily: "'Instrument Serif',Georgia,serif",
          }}>
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </h1>
        </div>
        {streak > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(251,146,60,0.08)",
            border: "1px solid rgba(251,146,60,0.2)",
            borderRadius: 100, padding: "6px 12px",
          }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.warn, lineHeight: 1 }}>{streak}</div>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1.5, textTransform: "uppercase" }}>streak</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalCnt > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: C.textMid }}>
              {doneCnt} of {totalCnt} complete
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: pct === 100 ? C.success : C.textMid, fontFamily: "'DM Mono',monospace" }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 3, background: C.surfaceHi, borderRadius: 2 }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: 2,
              background: pct === 100 ? C.success : C.accent,
              transition: "width 0.7s cubic-bezier(.34,1.56,.64,1)",
              boxShadow: pct === 100 ? `0 0 10px rgba(74,222,128,0.5)` : `0 0 8px ${C.accentGlow}`,
            }} />
          </div>
        </div>
      )}

      {/* Section: active */}
      {visibleTasks.filter(t => !completedIds.includes(t.id)).length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>
            Active
          </div>
          {visibleTasks.filter(t => !completedIds.includes(t.id)).map((task, i) => (
            <div key={task.id} style={{ animation: `fadeUp 0.35s ease ${i * 50}ms backwards` }}>
              <TaskCard
                task={task}
                entry={null}
                isRunning={!!timers[task.id]}
                elapsed={liveTime[task.id] || 0}
                onToggle={() => onToggle(task)}
                onDelete={() => onDelete(task.id)}
                onEdit={() => handleEdit(task)}
                onStart={() => onStart(task.id)}
                onStop={() => onStop(task.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Section: done */}
      {visibleTasks.filter(t => completedIds.includes(t.id)).length > 0 && (
        <div style={{ marginBottom: 4, marginTop: 16 }}>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>
            Completed
          </div>
          {visibleTasks.filter(t => completedIds.includes(t.id)).map((task, i) => {
            const entry = todayEntries.find(e => e.id === task.id);
            return (
              <div key={task.id} style={{ animation: `fadeUp 0.35s ease ${i * 50}ms backwards` }}>
                <TaskCard
                  task={task}
                  entry={entry}
                  isRunning={false}
                  elapsed={0}
                  onToggle={() => onToggle(task)}
                  onDelete={() => onDelete(task.id)}
                  onEdit={() => handleEdit(task)}
                  onStart={() => { }}
                  onStop={() => { }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {visibleTasks.length === 0 && (
        <div style={{
          textAlign: "center", padding: "56px 20px",
          background: C.surface, borderRadius: 20,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>—</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>No tasks for today</div>
          <div style={{ fontSize: 13, color: C.textDim }}>Tap + to add your first task</div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setEditTask(null); setShowSheet(true); }}
        style={{
          position: "fixed", bottom: 100, right: 20,
          width: 52, height: 52, borderRadius: "50%",
          background: C.surfaceHi,
          border: `1px solid ${C.borderHi}`,
          cursor: "pointer", fontSize: 22, color: C.text,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
          transition: "all 0.25s cubic-bezier(.34,1.56,.64,1)", zIndex: 20,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.borderColor = C.accent; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = C.borderHi; }}
      >+</button>

      {showSheet && (
        <TaskSheet
          task={editTask}
          onSave={handleSave}
          onClose={() => { setShowSheet(false); setEditTask(null); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   CALENDAR HISTORY
══════════════════════════════════════════ */
function CalendarHistory({ history, tasks }) {
  const [level, setLevel] = useState("year");
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selMonth, setSelMonth] = useState(null);
  const [selWeek, setSelWeek] = useState(null);
  const [selDay, setSelDay] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  const go = (newLevel, data = {}) => {
    setAnimKey(k => k + 1);
    if (data.year !== undefined) setSelYear(data.year);
    if (data.month !== undefined) setSelMonth(data.month);
    if (data.week !== undefined) setSelWeek(data.week);
    if (data.day !== undefined) setSelDay(data.day);
    setLevel(newLevel);
  };

  const back = () => {
    setAnimKey(k => k + 1);
    if (level === "day") setLevel("week");
    else if (level === "week") setLevel("month");
    else if (level === "month") setLevel("year");
  };

  const pctOf = (dk) => {
    const e = history[dk] || [];
    return tasks.length > 0 ? e.length / tasks.length : 0;
  };
  const dotColor = (p) =>
    p >= 1 ? C.success : p >= 0.6 ? C.accent : p > 0 ? "rgba(232,213,163,0.4)" : C.surfaceHi;

  /* YEAR VIEW */
  const YearView = () => (
    <div key={animKey} className="cal-anim" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
      {Array.from({ length: 12 }, (_, m) => {
        const dim = new Date(selYear, m + 1, 0).getDate();
        const days = Array.from({ length: dim }, (_, d) => {
          const dk = `${selYear}-${pad(m + 1)}-${pad(d + 1)}`;
          return pctOf(dk);
        });
        const monthActivity = days.filter(p => p > 0).length;
        return (
          <button key={m}
            onClick={() => go("month", { month: m })}
            style={{
              background: C.surface, border: `1px solid ${monthActivity > 0 ? C.borderMid : C.border}`,
              borderRadius: 14, padding: "12px 10px",
              cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = monthActivity > 0 ? C.borderMid : C.border; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textMid, marginBottom: 8, letterSpacing: 0.3 }}>
              {MONTHS_S[m]}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              {days.slice(0, 25).map((p, i) => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: 1.5,
                  background: dotColor(p),
                  transition: "background 0.2s",
                }} />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );

  /* MONTH VIEW */
  const MonthView = () => {
    const first = new Date(selYear, selMonth, 1).getDay();
    const dim = new Date(selYear, selMonth + 1, 0).getDate();
    const weeks = Math.ceil((first + dim) / 7);
    return (
      <div key={animKey} className="cal-anim">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
          {DAYS_S.map(d => (
            <div key={d} style={{ fontSize: 10, color: C.textDim, textAlign: "center", letterSpacing: .5, fontFamily: "'DM Mono',monospace" }}>{d}</div>
          ))}
        </div>
        {Array.from({ length: weeks }, (_, wk) => (
          <button key={wk}
            onClick={() => go("week", { week: wk })}
            style={{
              display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4,
              marginBottom: 6, width: "100%", background: "transparent",
              border: "none", cursor: "pointer", borderRadius: 12,
              transition: "background 0.18s", padding: "3px 0",
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.surfaceUp}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            {Array.from({ length: 7 }, (_, dow) => {
              const dn = wk * 7 + dow - first + 1;
              if (dn < 1 || dn > dim) return <div key={dow} />;
              const dk = `${selYear}-${pad(selMonth + 1)}-${pad(dn)}`;
              const p = pctOf(dk);
              const isT = dk === todayStr();
              return (
                <div key={dow} style={{
                  aspectRatio: "1", borderRadius: 9,
                  background: isT ? C.accent : p > 0 ? dotColor(p) : C.surfaceUp,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: isT ? 700 : 400,
                  color: isT ? C.bg : p > 0 ? "white" : C.textDim,
                  border: isT ? `1px solid ${C.accent}` : "none",
                  boxShadow: isT ? `0 0 12px ${C.accentGlow}` : "none",
                }}>{dn}</div>
              );
            })}
          </button>
        ))}
      </div>
    );
  };

  /* WEEK VIEW */
  const WeekView = () => {
    const first = new Date(selYear, selMonth, 1).getDay();
    const dim = new Date(selYear, selMonth + 1, 0).getDate();
    const days = Array.from({ length: 7 }, (_, dow) => {
      const dn = selWeek * 7 + dow - first + 1;
      if (dn < 1 || dn > dim) return null;
      const d = new Date(selYear, selMonth, dn);
      return { dn, dk: d.toISOString().split("T")[0], dow: d.getDay() };
    });
    return (
      <div key={animKey} className="cal-anim">
        <div style={{ display: "flex", gap: 8 }}>
          {days.map((item, i) => {
            if (!item) return <div key={i} style={{ flex: 1 }} />;
            const { dn, dk, dow } = item;
            const p = pctOf(dk);
            const isT = dk === todayStr();
            const ent = history[dk] || [];
            const total = ent.filter(e => e.completedAt && e.startedAt).reduce((s, e) => s + (e.completedAt - e.startedAt), 0);
            return (
              <button key={dk}
                onClick={() => go("day", { day: dk })}
                style={{
                  flex: 1, padding: "12px 6px",
                  background: isT ? C.accentDim : C.surface,
                  border: `1px solid ${isT ? C.accent : p > 0 ? dotColor(p) + "44" : C.border}`,
                  borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.2s ease",
                  boxShadow: isT ? `0 0 16px ${C.accentGlow}` : "none",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ fontSize: 10, color: isT ? C.accent : C.textDim, letterSpacing: .5, marginBottom: 4 }}>{DAYS_S[dow]}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: isT ? C.accent : C.text }}>{dn}</div>
                <div style={{ height: 3, background: C.surfaceHi, borderRadius: 2, margin: "8px 0 4px" }}>
                  <div style={{
                    height: "100%", width: `${p * 100}%`,
                    borderRadius: 2, background: dotColor(p),
                  }} />
                </div>
                <div style={{ fontSize: 10, color: C.textDim, fontFamily: "'DM Mono',monospace" }}>
                  {Math.round(p * 100)}%
                </div>
                {total > 0 && <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>{fmtMs(total)}</div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /* DAY VIEW */
  const DayView = () => {
    const entries = history[selDay] || [];
    const done = entries.map(e => e.id);
    const total = entries.filter(e => e.completedAt && e.startedAt).reduce((s, e) => s + (e.completedAt - e.startedAt), 0);
    const d = fmtDate(selDay);
    const isT = selDay === todayStr();
    const pct = tasks.length > 0 ? Math.round((entries.length / tasks.length) * 100) : 0;
    return (
      <div key={animKey} className="cal-anim">
        <div style={{
          background: C.surface, borderRadius: 16, padding: "18px 18px",
          border: `1px solid ${C.border}`, marginBottom: 18,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'Instrument Serif',Georgia,serif" }}>
              {isT ? "Today" : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4, fontFamily: "'DM Mono',monospace" }}>
              {entries.length} tasks · {fmtMs(total) || "no time"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: pct >= 100 ? C.success : C.text, fontFamily: "'DM Mono',monospace" }}>{pct}%</div>
            <div style={{ fontSize: 10, color: C.textDim }}>complete</div>
          </div>
        </div>
        {entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: C.textDim }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>—</div>
            <div>Nothing completed</div>
          </div>
        ) : (
          tasks.filter(t => done.includes(t.id)).map(task => {
            const e = entries.find(x => x.id === task.id);
            const dur = e?.completedAt && e?.startedAt ? fmtMs(e.completedAt - e.startedAt) : null;
            const exceeded = task.goalMin > 0 && e && (e.completedAt - e.startedAt) > task.goalMin * 60 * 1000;
            return (
              <div key={task.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: "13px 16px", marginBottom: 8,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5, background: C.success,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L3.5 7L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{task.name}</div>
                  {task.description && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {dur && <div style={{ fontSize: 11, color: exceeded ? C.warn : C.textMid, fontFamily: "'DM Mono',monospace" }}>{dur}{exceeded ? " ↑" : ""}</div>}
                  {task.goalMin > 0 && <div style={{ fontSize: 10, color: C.textDim }}>Goal: {fmtGoal(task.goalMin)}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const breadcrumbs = [
    { level: "year", label: String(selYear) },
    ...(selMonth !== null ? [{ level: "month", label: MONTHS_S[selMonth] }] : []),
    ...(selWeek !== null ? [{ level: "week", label: `Wk ${selWeek + 1}` }] : []),
    ...(selDay ? [{ level: "day", label: selDay.slice(5) }] : []),
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {level !== "year" && (
          <button onClick={back} style={{
            background: C.surfaceHi, border: `1px solid ${C.border}`,
            borderRadius: 100, padding: "5px 12px",
            color: C.textMid, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 4, marginRight: 4,
          }}>← Back</button>
        )}
        {breadcrumbs.map((b, i) => (
          <span key={b.level} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              fontSize: 12, fontFamily: "'DM Mono',monospace",
              color: b.level === level ? C.text : C.textDim,
              fontWeight: b.level === level ? 600 : 400,
            }}>{b.label}</span>
            {i < breadcrumbs.length - 1 && <span style={{ color: C.textDim, fontSize: 10 }}>/</span>}
          </span>
        ))}
      </div>

      {level === "year" && <YearView />}
      {level === "month" && <MonthView />}
      {level === "week" && <WeekView />}
      {level === "day" && <DayView />}
    </div>
  );
}

/* ══════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════ */
function Analytics({ history, tasks }) {
  const today = todayStr();
  const streak = calcStreak(history);
  const best = useMemo(() => {
    let b = 0, r = 0;
    const d = new Date();
    for (let i = 0; i < 400; i++) {
      const k = d.toISOString().split("T")[0]; d.setDate(d.getDate() - 1);
      (history[k] || []).length > 0 ? (r++, b = Math.max(b, r)) : (r = 0);
    }
    return b;
  }, [history]);

  const totalMs = useMemo(() =>
    Object.values(history).flat().filter(e => e.completedAt && e.startedAt)
      .reduce((s, e) => s + (e.completedAt - e.startedAt), 0)
    , [history]);

  const totalDone = useMemo(() =>
    Object.values(history).reduce((s, d) => s + (d || []).length, 0)
    , [history]);

  const days30 = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const k = d.toISOString().split("T")[0];
    return { k, pct: tasks.length > 0 ? ((history[k] || []).length / tasks.length) : 0 };
  }), [history, tasks]);

  const curr7 = useMemo(() => days30.slice(-7), [days30]);
  const prev7 = useMemo(() => days30.slice(-14, -7), [days30]);
  const maxV = Math.max(1, ...days30.map(d => d.pct));

  // SVG line chart
  const W = 320, H = 80, P = 14;
  const xFor = (i, n) => P + (i / (n - 1 || 1)) * (W - P * 2);
  const yFor = (v) => H - P - (v / maxV) * (H - P * 2);
  const pts7 = curr7.map((d, i) => `${xFor(i, 7)},${yFor(d.pct)}`).join(" ");
  const pts7p = prev7.map((d, i) => `${xFor(i, 7)},${yFor(d.pct)}`).join(" ");
  const area = `${xFor(0, 7)},${H - P} ${pts7} ${xFor(6, 7)},${H - P}`;

  return (
    <div>
      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Streak", val: `${streak}d`, sub: "current", g: C.warn },
          { label: "Best", val: `${best}d`, sub: "streak", g: C.accent },
          { label: "Completed", val: totalDone, sub: "all-time", g: C.success },
          { label: "Time Logged", val: fmtMs(totalMs) || "—", sub: "total", g: C.textMid },
        ].map(s => (
          <div key={s.label} style={{
            background: C.surface, borderRadius: 16, padding: "18px 16px",
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.g, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 5, letterSpacing: 1.2, textTransform: "uppercase" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div style={{
        background: C.surface, borderRadius: 18, padding: "18px",
        border: `1px solid ${C.border}`, marginBottom: 14,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Weekly Comparison</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>This week vs last week</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {[{ c: C.accent, l: "This" }, { c: C.textDim, l: "Last" }].map(x => (
              <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: x.c }} />
                <span style={{ fontSize: 10, color: C.textDim }}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          <defs>
            <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.accent} stopOpacity="0.2" />
              <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, .25, .5, .75, 1].map(f => (
            <line key={f} x1={P} y1={yFor(maxV * f)} x2={W - P} y2={yFor(maxV * f)}
              stroke={C.border} strokeWidth="1" />
          ))}
          <polygon points={area} fill="url(#ag)" />
          <polyline points={pts7p} fill="none" stroke={C.textDim} strokeWidth="1.5"
            strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={pts7} fill="none" stroke={C.accent} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" />
          {curr7.map((d, i) => (
            <circle key={i} cx={xFor(i, 7)} cy={yFor(d.pct)} r="3.5"
              fill={C.accent} stroke={C.bg} strokeWidth="2" />
          ))}
          {curr7.map((d, i) => {
            const lbl = new Date(d.k + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
            return <text key={i} x={xFor(i, 7)} y={H - 1} textAnchor="middle"
              fill={C.textDim} fontSize="8" fontFamily="'DM Mono',monospace">{lbl}</text>;
          })}
        </svg>
      </div>

      {/* 30-day bars */}
      <div style={{
        background: C.surface, borderRadius: 18, padding: "18px",
        border: `1px solid ${C.border}`, marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 14 }}>30-Day History</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: 64 }}>
          {days30.map((d, i) => (
            <div key={d.k} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}
              title={`${d.k}: ${Math.round(d.pct * 100)}%`}>
              <div style={{
                width: "100%",
                height: `${Math.max(d.pct * 100, d.pct > 0 ? 8 : 3)}%`,
                borderRadius: "2px 2px 1px 1px",
                background: d.pct >= 1 ? C.success : d.pct > 0 ? C.accent : C.surfaceHi,
                transition: `height 0.5s ease ${i * 8}ms`,
                opacity: d.pct >= 1 ? 1 : d.pct > 0 ? 0.7 : 0.3,
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'DM Mono',monospace" }}>30d ago</span>
          <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'DM Mono',monospace" }}>Today</span>
        </div>
      </div>

      {/* Per-task */}
      <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>
        Per-Task
      </div>
      {tasks.map((task, i) => {
        const allE = Object.values(history).flat().filter(e => e.id === task.id);
        const days = Object.keys(history).filter(k => (history[k] || []).some(e => e.id === task.id));
        const ms = allE.filter(e => e.completedAt && e.startedAt).reduce((s, e) => s + (e.completedAt - e.startedAt), 0);
        const recBadge = { once: "○", daily: "↺", weekdays: "M–F", weekends: "S–S", weekly: "⟳" }[task.recurrence] || "";
        return (
          <div key={task.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: C.surface, borderRadius: 14, padding: "13px 14px",
            border: `1px solid ${C.border}`, marginBottom: 8,
            animation: `fadeUp 0.35s ease ${i * 40}ms backwards`,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{task.name}</span>
                <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'DM Mono',monospace" }}>{recBadge}</span>
              </div>
              {task.description && (
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</div>
              )}
              <div style={{ height: 2, background: C.surfaceHi, borderRadius: 2, marginTop: 8 }}>
                <div style={{
                  height: "100%", width: `${Math.min(100, (days.length / 30) * 100)}%`,
                  borderRadius: 2, background: C.accent,
                  transition: "width 0.6s ease",
                }} />
              </div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 4, fontFamily: "'DM Mono',monospace" }}>
                {days.length}d done{fmtMs(ms) ? ` · ${fmtMs(ms)}` : ""}{task.goalMin > 0 ? ` · goal ${fmtGoal(task.goalMin)}` : ""}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'DM Mono',monospace" }}>{days.length}</div>
              <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1 }}>DAYS</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════ */
export default function App() {
  const [tasks, setTasks] = useState([
    { id: 1, name: "Deep Work Session", description: "No distractions, full focus block", recurrence: "weekdays", goalMin: 90 },
    { id: 2, name: "Morning Workout", description: "Cardio + strength training", recurrence: "daily", goalMin: 45 },
    { id: 3, name: "Read", description: "Non-fiction, minimum 20 pages", recurrence: "daily", goalMin: 30 },
    { id: 4, name: "Weekly Review", description: "Reflect on the week, plan ahead", recurrence: "weekly", goalMin: 60 },
  ]);
  const [history, setHistory] = useState({});
  const [tab, setTab] = useState("today");
  const [timers, setTimers] = useState({});
  const [liveTime, setLiveTime] = useState({});
  const [mounted, setMounted] = useState(false);
  const [splash, setSplash] = useState(true);

  useEffect(() => { setTimeout(() => setSplash(false), 2800); }, []);
  useEffect(() => {
    try {
      const r = localStorage.getItem(STORE);
      if (r) { const d = JSON.parse(r); if (d.tasks) setTasks(d.tasks); if (d.history) setHistory(d.history); }
    } catch (e) { }
    setTimeout(() => setMounted(true), 80);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(STORE, JSON.stringify({ tasks, history })); } catch (e) { }
  }, [tasks, history, mounted]);

  useEffect(() => {
    const ids = Object.keys(timers);
    if (!ids.length) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setLiveTime(p => { const n = { ...p }; ids.forEach(id => { n[id] = now - timers[id]; }); return n; });
    }, 500);
    return () => clearInterval(iv);
  }, [timers]);

  const TODAY = todayStr();

  const toggleTask = useCallback((task) => {
    const entries = history[TODAY] || [];
    const isDone = entries.some(e => e.id === task.id);
    setTimers(p => { const n = { ...p }; delete n[task.id]; return n; });
    setLiveTime(p => { const n = { ...p }; delete n[task.id]; return n; });
    setHistory(prev => {
      const ents = prev[TODAY] || [];
      if (isDone) return { ...prev, [TODAY]: ents.filter(e => e.id !== task.id) };
      const startedAt = timers[task.id] || Date.now() - 500;
      return { ...prev, [TODAY]: [...ents.filter(e => e.id !== task.id), { id: task.id, startedAt, completedAt: Date.now() }] };
    });
  }, [history, TODAY, timers]);

  const deleteTask = useCallback((id) => {
    setTasks(p => p.filter(t => t.id !== id));
    setHistory(p => { const u = { ...p }; Object.keys(u).forEach(k => { u[k] = (u[k] || []).filter(e => e.id !== id); }); return u; });
    setTimers(p => { const n = { ...p }; delete n[id]; return n; });
  }, []);

  const saveTask = useCallback((taskData) => {
    setTasks(p => {
      const idx = p.findIndex(t => t.id === taskData.id);
      if (idx >= 0) { const n = [...p]; n[idx] = taskData; return n; }
      return [...p, taskData];
    });
  }, []);

  const startTimer = useCallback((id) => { setTimers(p => ({ ...p, [id]: Date.now() })); }, []);
  const stopTimer = useCallback((id) => {
    setTimers(p => { const n = { ...p }; delete n[id]; return n; });
    setLiveTime(p => { const n = { ...p }; delete n[id]; return n; });
  }, []);

  /* SPLASH */
  if (splash) return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: C.bg, position: "relative", overflow: "hidden",
    }}>
      <Background />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Animated Logo Mark */}
          <div style={{ animation: "logoMarkIn 1s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
            <svg width="64" height="64" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill={C.surfaceHi} />
              <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" stroke={C.borderMid} />
              <path d="M7 20V8L14 15L21 8V20" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 40, strokeDashoffset: 40, animation: "drawM 1.2s ease forwards 0.4s" }} />
              <circle cx="14" cy="15" r="1.4" fill={C.accent} style={{ opacity: 0, animation: "fadeInDot 0.6s ease forwards 1.2s" }} />
            </svg>
          </div>
          {/* Animated App Name */}
          <div style={{ overflow: "hidden", paddingBottom: 6 }}>
            <span style={{
              display: "block",
              fontSize: 46, fontWeight: 700, letterSpacing: -0.8,
              color: C.text, fontFamily: "'Instrument Serif',Georgia,serif",
              fontStyle: "italic", lineHeight: 1,
              animation: "nameSlideUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards 0.6s",
              transform: "translateY(120%)", opacity: 0
            }}>Momentum</span>
          </div>
        </div>
        <div style={{
          fontSize: 13, color: C.textMid, letterSpacing: 4.5,
          textTransform: "uppercase", fontFamily: "'DM Mono',monospace",
          marginTop: 28, opacity: 0,
          animation: "fadeInSlogan 1s ease forwards 1.4s",
        }}>Your daily momentum</div>
      </div>
      <style>{`
        @keyframes logoMarkIn {
          0% { opacity: 0; transform: scale(0.6) translateY(20px); filter: blur(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes drawM {
          100% { stroke-dashoffset: 0; }
        }
        @keyframes fadeInDot {
          100% { opacity: 1; filter: drop-shadow(0 0 8px ${C.accent}); }
        }
        @keyframes nameSlideUp {
          0% { transform: translateY(120%) rotate(2deg); opacity: 0; }
          100% { transform: translateY(0) rotate(0); opacity: 1; }
        }
        @keyframes fadeInSlogan {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      maxWidth: 430, margin: "0 auto", position: "relative",
      fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif",
    }}>
      <Background />

      <div style={{ position: "relative", zIndex: 1, padding: "52px 18px 120px", minHeight: "100vh" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <Logo />
          <div style={{
            fontSize: 11, color: C.textDim, letterSpacing: 1.5,
            textTransform: "uppercase", fontFamily: "'DM Mono',monospace",
          }}>
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>

        {/* Views */}
        <div key={tab} style={{ animation: "fadeUp 0.3s ease" }}>
          {tab === "today" && (
            <HomeScreen
              tasks={tasks} history={history}
              timers={timers} liveTime={liveTime}
              onToggle={toggleTask} onDelete={deleteTask}
              onEdit={saveTask} onAdd={saveTask}
              onStart={startTimer} onStop={stopTimer}
            />
          )}
          {tab === "history" && (
            <>
              <h2 style={{
                fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 22,
                fontFamily: "'Instrument Serif',Georgia,serif",
              }}>History</h2>
              <CalendarHistory history={history} tasks={tasks} />
            </>
          )}
          {tab === "progress" && (
            <>
              <h2 style={{
                fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 22,
                fontFamily: "'Instrument Serif',Georgia,serif",
              }}>Analytics</h2>
              <Analytics history={history} tasks={tasks} />
            </>
          )}
        </div>
      </div>

      <FloatingNav tab={tab} setTab={setTab} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:0;}
        input,textarea{color-scheme:dark;}
        input::placeholder,textarea::placeholder{color:${C.textDim};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
        .cal-anim{animation:fadeUp 0.32s cubic-bezier(.34,1.56,.64,1);}
      `}</style>
    </div>
  );
}
