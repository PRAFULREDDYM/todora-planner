import {
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
  useCallback,
  useRef,
} from "react";
// eslint-disable-next-line no-unused-vars
import { Reorder, AnimatePresence, motion } from "framer-motion";
import { jsPDF } from "jspdf";
import { ErrorBoundary } from "react-error-boundary";
import { createPortal } from "react-dom";
import { useAuth } from "./hooks/useAuth";
import {
  useProfile,
  useTasks,
  useNotes,
  useTaskHistory,
} from "./hooks/useSupabaseData";
import { AuthScreen } from "./components/Auth";

/* ══════════════════════════════════════════
   DESIGN TOKENS — Day / Night themes
══════════════════════════════════════════ */
const getTheme = (isDark) => ({
  bg: isDark ? "#0A0A0A" : "#F8F7F4", // Slightly warmer off-white like Todoist
  surface: isDark ? "#121212" : "#FFFFFF",
  surfaceUp: isDark ? "#181818" : "#F2F1ED",
  surfaceHi: isDark ? "#242424" : "#EBE8E0",
  border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
  borderMid: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
  borderHi: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
  accent: isDark ? "#E04F43" : "#D13E32", // Todoist Red
  accentDim: isDark ? "rgba(224,79,67,0.12)" : "rgba(209,62,50,0.08)",
  accentGlow: isDark ? "rgba(224,79,67,0.25)" : "rgba(209,62,50,0.2)",
  success: isDark ? "#4ADE80" : "#22C55E",
  danger: isDark ? "#F87171" : "#EF4444",
  warn: isDark ? "#FB923C" : "#F97316",
  text: isDark ? "#F5F3EE" : "#1A1A1A",
  textMid: isDark ? "#8A8880" : "#6B6963",
  textDim: isDark ? "#525252" : "#9C9A94",
  white: "#FFFFFF",
  isDark,
});

const ThemeContext = createContext();
const useTheme = () => useContext(ThemeContext);

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
export const todayStr = () => {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtMs = (ms) => {
  if (!ms || ms < 500) return null;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60 > 0 ? (s % 60) + "s" : ""}`.trim();
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};
const fmtLive = (ms) => {
  if (!ms) return "00:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const padInt = (n) => String(n).padStart(2, "0");
  if (h > 0) return `${padInt(h)}:${padInt(m % 60)}:${padInt(s % 60)}`;
  return `${padInt(m)}:${padInt(s % 60)}`;
};
const fmtGoal = (min) =>
  min >= 60
    ? `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}m` : ""}`
    : `${min}m`;

const STORE = "momentum_v5";

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (s) => new Date(s + "T12:00:00");

/* Pure utility — is a task scheduled/recurring on a given YYYY-MM-DD? */
function isTaskOnDate(task, dateKey) {
  if (!dateKey) return false;
  if (task.deadline === dateKey) return true;
  if (task.reminderAt && task.reminderAt.startsWith(dateKey)) return true;
  if (!task.recurrence || task.recurrence === 'once') return false;
  const d = new Date(dateKey + 'T12:00:00');
  const day = d.getDay();
  if (task.recurrence === 'daily') return true;
  if (task.recurrence === 'weekdays') return day >= 1 && day <= 5;
  if (task.recurrence === 'weekends') return day === 0 || day === 6;
  if (task.recurrence === 'weekly') {
    const startD = new Date((task.deadline || task.createdAt || dateKey) + 'T12:00:00');
    return day === startD.getDay();
  }
  return false;
}
const MONTHS_S = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS_S = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const FAMOUS_QUOTES = [
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
  },
  {
    text: "Your time is limited, so don't waste it living someone else's life.",
    author: "Steve Jobs",
  },
  {
    text: "The best way to predict the future is to create it.",
    author: "Peter Drucker",
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
  },
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
  },
  {
    text: "Hardships often prepare ordinary people for an extraordinary destiny.",
    author: "C.S. Lewis",
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
  },
  {
    text: "I find that the harder I work, the more luck I seem to have.",
    author: "Thomas Jefferson",
  },
  {
    text: "Don't count the days, make the days count.",
    author: "Muhammad Ali",
  },
  {
    text: "Strive not to be a success, but rather to be of value.",
    author: "Albert Einstein",
  },
  {
    text: "Everything you've ever wanted is on the other side of fear.",
    author: "George Addair",
  },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  {
    text: "What you get by achieving your goals is not as important as what you become by achieving your goals.",
    author: "Zig Ziglar",
  },
  {
    text: "Intelligence without ambition is a bird without wings.",
    author: "Salvador Dalí",
  },
  {
    text: "Do what you can, with what you have, where you are.",
    author: "Theodore Roosevelt",
  },
  {
    text: "Action is the foundational key to all success.",
    author: "Pablo Picasso",
  },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  {
    text: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle",
  },
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "It's not whether you get knocked down, it's whether you get up.",
    author: "Vince Lombardi",
  },
  {
    text: "The only limit to our realization of tomorrow will be our doubts of today.",
    author: "Franklin D. Roosevelt",
  },
  { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
  {
    text: "You miss 100% of the shots you don't take.",
    author: "Wayne Gretzky",
  },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "Eighty percent of success is showing up.", author: "Woody Allen" },
  { text: "If you can dream it, you can do it.", author: "Walt Disney" },
  {
    text: "A person who never made a mistake never tried anything new.",
    author: "Albert Einstein",
  },
  {
    text: "Life is what happens when you're making other plans.",
    author: "John Lennon",
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
  },
  {
    text: "Keep your eyes on the stars, and your feet on the ground.",
    author: "Theodore Roosevelt",
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
  },
  {
    text: "The mind is everything. What you think you become.",
    author: "Buddha",
  },
  {
    text: "If you want to live a happy life, tie it to a goal, not to people or things.",
    author: "Albert Einstein",
  },
  {
    text: "Never let the fear of striking out keep you from playing the game.",
    author: "Babe Ruth",
  },
  {
    text: "Money and success don't change people; they merely amplify what is already there.",
    author: "Will Smith",
  },
  {
    text: "Your time is limited, so don't waste it living someone else's life.",
    author: "Steve Jobs",
  },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  {
    text: "The successful warrior is the average man, with laser-like focus.",
    author: "Bruce Lee",
  },
  {
    text: "Everything has beauty, but not everyone sees it.",
    author: "Confucius",
  },
  {
    text: "Our greatest glory is not in never falling, but in rising every time we fall.",
    author: "Confucius",
  },
  {
    text: "I attribute my success to this: I never gave or took any excuse.",
    author: "Florence Nightingale",
  },
  {
    text: "The most difficult thing is the decision to act, the rest is merely tenacity.",
    author: "Amelia Earhart",
  },
  {
    text: "Every strike brings me closer to the next home run.",
    author: "Babe Ruth",
  },
  {
    text: "Definiteness of purpose is the starting point of all achievement.",
    author: "W. Clement Stone",
  },
  {
    text: "Life is 10% what happens to me and 90% of how I react to it.",
    author: "Charles Swindoll",
  },
  {
    text: "Go confidently in the direction of your dreams. Live the life you have imagined.",
    author: "Henry David Thoreau",
  },
  {
    text: "When I stand before God at the end of my life, I would hope that I would not have a single bit of talent left and could say, I used everything you gave me.",
    author: "Erma Bombeck",
  },
  {
    text: "Few things can help an individual more than to place responsibility on him, and to let him know that you trust him.",
    author: "Booker T. Washington",
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb",
  },
  {
    text: "I’m a greater believer in luck, and I find the harder I work the more I have of it.",
    author: "Thomas Jefferson",
  },
  {
    text: "Success is walking from failure to failure with no loss of enthusiasm.",
    author: "Winston Churchill",
  },
  {
    text: "The only place where success comes before work is in the dictionary.",
    author: "Vidal Sassoon",
  },
  {
    text: "Don't be afraid to give up the good to go for the great.",
    author: "John D. Rockefeller",
  },
  {
    text: "I find that when you have a real interest in life and a curious life, that sleep is not the most important thing.",
    author: "Martha Stewart",
  },
  {
    text: "If you really look close, most overnight successes took a long time.",
    author: "Steve Jobs",
  },
  {
    text: "The real test is not whether you avoid this failure, because you won't. It's whether you let it harden or shame you into inaction, or whether you learn from it.",
    author: "Barack Obama",
  },
  {
    text: "You can't use up creativity. The more you use, the more you have.",
    author: "Maya Angelou",
  },
  {
    text: "I have learned over the years that when one's mind is made up, this diminishes fear.",
    author: "Rosa Parks",
  },
];

function calcStreak(history) {
  let s = 0;
  let d = new Date();
  for (let i = 0; i < 365; i++) {
    const k = d.toISOString().split("T")[0];
    if ((history[k] || []).length > 0) {
      s++;
      d.setDate(d.getDate() - 1);
    } else {
      // If it's today and empty, check yesterday to continue streak
      if (i === 0) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return s;
}

function calcBestStreak(history) {
  let max = 0;
  let current = 0;
  const dates = Object.keys(history).sort();
  if (dates.length === 0) return 0;

  let prevDate = null;
  dates.forEach(dateStr => {
    const date = new Date(dateStr);
    if (prevDate) {
      const diffDays = Math.round((date - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        current++;
      } else {
        max = Math.max(max, current);
        current = 1;
      }
    } else {
      current = 1;
    }
    prevDate = date;
  });
  return Math.max(max, current);
}

function calcTotalTime(history) {
  let total = 0;
  Object.values(history).forEach(day => {
    day.forEach(task => {
      total += task.duration || 0;
    });
  });
  return total;
}


/* ══════════════════════════════════════════
   BACKGROUND (DECORATIVE)
══════════════════════════════════════════ */
function Background() {
  const { C } = useTheme();

  // Dark Mode Animated Background State & Effect — DESKTOP ONLY
  const [t, setT] = useState(0);
  const [isMobileBg] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    if (!C.isDark || isMobileBg) return;
    let raf,
      st = null;
    const loop = (ts) => {
      if (!st) st = ts;
      setT((ts - st) / 18000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [C.isDark, isMobileBg]);

  // Light mode — simple SVG gradient
  if (!C.isDark) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
          background: C.bg,
        }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, top: 0, left: 0 }}
        >
          <linearGradient id="lightBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F5F3EF" stopOpacity="0.2" />
          </linearGradient>
          <rect width="100%" height="100%" fill="url(#lightBg)" />
        </svg>
      </div>
    );
  }

  // Mobile dark mode — simple static background (no animated SVG filters)
  if (isMobileBg) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
          background: C.bg,
        }}
      />
    );
  }

  // Desktop dark mode — animated SVG gradients
  const s = Math.sin(t * Math.PI * 2),
    c = Math.cos(t * Math.PI * 2),
    s2 = Math.sin(t * Math.PI * 2 + 1.8);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: C.bg,
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient
            id="rg1"
            cx={`${44 + s * 14}%`}
            cy={`${28 + c * 12}%`}
            r="42%"
          >
            <stop offset="0%" stopColor="#301B1A" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#301B1A" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="rg2"
            cx={`${68 + c * 12}%`}
            cy={`${62 + s2 * 16}%`}
            r="36%"
          >
            <stop offset="0%" stopColor="#1A152A" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1A152A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#rg1)" />
        <rect width="100%" height="100%" fill="url(#rg2)" />
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════
   TASK SHEET
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
const RECUR_OPTS = [
  { id: "once", label: "Once" },
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
  { id: "weekly", label: "Weekly" },
];
const PRIORITY_OPTS = [
  { id: "low", label: "Low", color: "#22C55E" },
  { id: "mid", label: "Mid", color: "#F97316" },
  { id: "high", label: "High", color: "#EF4444" },
];
const CATEGORY_OPTS = [
  { id: "Quick Win", label: "Quick Win (5m)", icon: "⚡" },
  { id: "Deep Work", label: "Deep Work", icon: "🧠" },
  { id: "Creative", label: "Creative", icon: "🎨" },
];




/* ══════════════════════════════════════════
   WHEEL PICKER (iPhone-style revolving dial)
══════════════════════════════════════════ */
function WheelPicker({ items, value, onChange, width = 64 }) {
  const { C } = useTheme();
  const ref = useRef(null);
  const ITEM_H = 40;
  const VISIBLE = 5;
  const idx = Math.max(0, items.indexOf(value));
  const [offset, setOffset] = useState(idx * ITEM_H);
  const drag = useRef(null);

  const clamp = (v) => Math.max(0, Math.min((items.length - 1) * ITEM_H, v));

  const snap = (raw) => {
    const snapped = clamp(Math.round(raw / ITEM_H) * ITEM_H);
    setOffset(snapped);
    onChange(items[Math.round(snapped / ITEM_H)]);
  };

  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = (e) => {
    drag.current = { startY: e.clientY, startOff: offset, moved: false };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const delta = drag.current.startY - e.clientY;
    if (Math.abs(delta) > 5) drag.current.moved = true;
    setOffset(clamp(drag.current.startOff + delta));
  };
  const onPointerUp = (e) => {
    if (!drag.current) return;
    if (drag.current.moved)
      snap(drag.current.startOff + (drag.current.startY - e.clientY));
    drag.current = null;
    setIsDragging(false);
  };

  // Sync when external value changes
  useEffect(() => {
    const i = items.indexOf(value);
    if (i >= 0 && i * ITEM_H !== offset) {
      setOffset(i * ITEM_H);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const centerIdx = Math.round(offset / ITEM_H);

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        width,
        height: ITEM_H * VISIBLE,
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
        cursor: "ns-resize",
        touchAction: "none",
      }}
    >
      {/* Selection highlight */}
      <div
        style={{
          position: "absolute",
          top: ITEM_H * Math.floor(VISIBLE / 2),
          left: 0,
          right: 0,
          height: ITEM_H,
          background: C.accentDim,
          borderRadius: 10,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {/* Top/Bottom fade */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to bottom, ${C.surface} 0%, transparent 30%, transparent 70%, ${C.surface} 100%)`,
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      {/* Items */}
      <div
        style={{
          transform: `translateY(${ITEM_H * Math.floor(VISIBLE / 2) - offset}px)`,
          transition: isDragging
            ? "none"
            : "transform 0.2s cubic-bezier(.32,.72,0,1)",
        }}
      >
        {items.map((item, i) => (
          <div
            key={item}
            onClick={() => {
              setOffset(i * ITEM_H);
              onChange(item);
            }}
            style={{
              height: ITEM_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: i === centerIdx ? 700 : 400,
              color: i === centerIdx ? C.text : C.textDim,
              cursor: "pointer",
              zIndex: 1,
              position: "relative",
              transition: "all 0.1s",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Reminder time picker using WheelPicker drums */
function TimeDrumPicker({ value, onChange }) {
  const { C } = useTheme();

  const dateOptions = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      if (i === 0) return { id: iso, label: "Today" };
      if (i === 1) return { id: iso, label: "Tomorrow" };
      return {
        id: iso,
        label: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    });
  }, []);

  const hours = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0"),
  );
  const periods = ["AM", "PM"];

  const parse = (v) => {
    const todayIso = new Date().toISOString().split("T")[0];
    if (!v) return { dId: todayIso, h: "09", m: "00", p: "AM" };
    const [date, time] = v.includes("T") ? v.split("T") : [todayIso, v];
    const [hRaw, mRaw] = (time || "09:00").split(":");
    const hr = parseInt(hRaw);
    return {
      dId: date || todayIso,
      h: String(hr > 12 ? hr - 12 : hr === 0 ? 12 : hr).padStart(2, "0"),
      m: (mRaw || "00").slice(0, 2),
      p: hr >= 12 ? "PM" : "AM",
    };
  };

  const { dId, h, m, p } = parse(value);
  const dateLabels = dateOptions.map((opt) => opt.label);
  const selectedDateLabel =
    dateOptions.find((opt) => opt.id === dId)?.label || "Today";

  const emit = (ndLabel, nh, nm, np) => {
    let hr = parseInt(nh);
    if (np === "PM" && hr !== 12) hr += 12;
    if (np === "AM" && hr === 12) hr = 0;
    const ndId =
      dateOptions.find((opt) => opt.label === ndLabel)?.id ||
      new Date().toLocaleDateString('en-CA'); // Local ISO date
    onChange(`${ndId}T${String(hr).padStart(2, "0")}:${nm}:00`);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        background: C.surfaceUp,
        borderRadius: 16,
        padding: "12px",
        border: `1px solid ${C.border}`,
        overflowX: "auto",
      }}
    >
      <WheelPicker
        items={dateLabels}
        value={selectedDateLabel}
        onChange={(v) => emit(v, h, m, p)}
        width={80}
      />
      <div
        style={{
          width: 1,
          height: 24,
          background: C.borderMid,
          margin: "0 4px",
        }}
      />
      <WheelPicker
        items={hours}
        value={h}
        onChange={(v) => emit(selectedDateLabel, v, m, p)}
        width={40}
      />
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: C.textDim,
          paddingBottom: 2,
        }}
      >
        :
      </div>
      <WheelPicker
        items={minutes}
        value={m}
        onChange={(v) => emit(selectedDateLabel, h, v, p)}
        width={40}
      />
      <WheelPicker
        items={periods}
        value={p}
        onChange={(v) => emit(selectedDateLabel, h, m, v)}
        width={42}
      />
    </div>
  );
}

function TaskSheet({ task, onSave, onClose, isWearable, isMobile }) {
  const { C } = useTheme();
  const isEdit = !!task?.id;
  const [name, setName] = useState(task?.name || "");
  const [description, setDescription] = useState(task?.description || "");
  const [recurrence, setRecurrence] = useState(task?.recurrence || "once");
  const [goalMin, setGoalMin] = useState(task?.goalMin ?? 0);
  const [reminderAt, setReminderAt] = useState(task?.reminderAt || "");
  const [priority, setPriority] = useState(task?.priority || "mid");
  const [category, setCategory] = useState(task?.category || "Quick Win");
  const [deadline, setDeadline] = useState(task?.deadline || "");
  const [image, setImage] = useState(task?.image || null);
  const [starred, setStarred] = useState(task?.isStarred || false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  const onImg = (e) => {
    const f = e.target.files[0];
    if (f) {
      const r = new FileReader();
      r.onload = (ex) => setImage(ex.target.result);
      r.readAsDataURL(f);
    }
  };

  const close = () => {
    setShow(false);
    setTimeout(onClose, 360);
  };
  const submit = () => {
    if (!name.trim()) return;
    onSave({
      id: task?.id || Math.random().toString(36).slice(2, 9),
      name: name.trim(),
      description: description.trim(),
      recurrence,
      goalMin,
      reminderAt,
      priority,
      category,
      deadline,
      image,
      createdAt: task?.createdAt || todayStr(),
      order: task?.order ?? 0,
      isStarred: starred,
    });
    close();
  };

  const inputStyle = {
    width: "100%",
    background: C.surfaceUp,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "12px 14px",
    color: C.text,
    fontFamily: "inherit",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    resize: "none",
  };

  // Wearable Sheet (very small)
  if (isWearable) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: C.bg,
          display: "flex",
          flexDirection: "column",
          padding: "20px 10px",
          transform: show ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s ease",
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Task name..."
          autoFocus
          style={{ ...inputStyle, marginBottom: 10, background: C.surface }}
        />
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            marginBottom: 10,
          }}
        >
          {PRIORITY_OPTS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPriority(p.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${priority === p.id ? p.color : C.border}`,
                background: priority === p.id ? p.color : "transparent",
                color: priority === p.id ? "#FFF" : C.textDim,
                fontSize: 11,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={submit}
          style={{
            padding: "12px",
            background: C.accent,
            color: "#fff",
            border: "none",
            borderRadius: 100,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Save
        </button>
        <button
          onClick={close}
          style={{
            padding: "12px",
            background: "transparent",
            color: C.textMid,
            border: "none",
            fontWeight: 600,
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Desktop/Mobile Sheet Modal
  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={close}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          opacity: show ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: C.surface,
          borderRadius: isMobile ? "24px" : "16px",
          width: isMobile ? "100%" : 460,
          maxWidth: 460,
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          transform: show
            ? isMobile
              ? "translateY(0)"
              : "scale(1)"
            : isMobile
              ? "translateY(100%)"
              : "scale(0.9)",
          opacity: show ? 1 : 0,
          transition: "all 0.3s cubic-bezier(.32,.72,0,1)",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            paddingBottom: isMobile ? 80 : 20,
            maxHeight: isMobile ? "90vh" : "85vh",
            overflowY: "auto",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: C.text,
              margin: "0 0 20px 0",
            }}
          >
            {isEdit ? "Edit task" : "Add task"}
          </h2>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Deep work session"
            autoFocus
            style={{ ...inputStyle, marginBottom: 16 }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          <label
            style={{
              fontSize: 12,
              color: C.textDim,
              fontWeight: 500,
              display: "block",
              marginBottom: 8,
            }}
          >
            Priority & Category
          </label>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, display: "flex", gap: 4 }}>
              {PRIORITY_OPTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: 8,
                    border: `1px solid ${priority === p.id ? p.color : C.borderMid}`,
                    background: priority === p.id ? p.color : "transparent",
                    color: priority === p.id ? "#FFF" : C.textMid,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, width: "150px", padding: "8px" }}
            >
              {CATEGORY_OPTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 15,
              marginBottom: 20,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: C.textDim,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                style={{ ...inputStyle, padding: "8px" }}
              >
                {RECUR_OPTS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: C.textDim,
                  fontWeight: 500,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                style={{ ...inputStyle, padding: "8px" }}
              />
            </div>
          </div>

          <label
            style={{
              fontSize: 12,
              color: C.textDim,
              fontWeight: 500,
              display: "block",
              marginBottom: 8,
            }}
          >
            Goal Duration
          </label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 20,
            }}
          >
            {GOAL_OPTS.map((opt) => (
              <button
                key={opt.min}
                onClick={() => setGoalMin(opt.min)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: `1px solid ${goalMin === opt.min ? C.accent : C.borderMid}`,
                  background: goalMin === opt.min ? C.accentDim : "transparent",
                  color: goalMin === opt.min ? C.accent : C.textMid,
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                fontSize: 12,
                color: C.textDim,
                fontWeight: 500,
                display: "block",
                marginBottom: 10,
              }}
            >
              Reminder Time
            </label>
            <TimeDrumPicker value={reminderAt} onChange={setReminderAt} />
            {reminderAt && (
              <button
                onClick={() => setReminderAt("")}
                style={{
                  marginTop: 8,
                  padding: "6px 14px",
                  background: "none",
                  border: `1px solid ${C.danger}40`,
                  borderRadius: 8,
                  color: C.danger,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✕ Remove Reminder
              </button>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 12,
                color: C.textDim,
                fontWeight: 500,
                display: "block",
                marginBottom: 8,
              }}
            >
              Image
            </label>
            <label
              style={{ ...inputStyle, cursor: "pointer", display: "block" }}
            >
              {image ? "✓ Change Image" : "📎 Upload Image"}
              <input type="file" hidden accept="image/*" onChange={onImg} />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setStarred((p) => !p)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 22,
                color: starred ? "#FFD700" : C.textDim,
                padding: "4px",
              }}
            >
              {starred ? "★" : "☆"}
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={close}
              style={{
                padding: "11px 20px",
                borderRadius: 100,
                background: C.surfaceUp,
                color: C.text,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: 0.1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              style={{
                padding: "11px 24px",
                borderRadius: 100,
                background: name.trim() ? C.accent : C.surfaceHi,
                color: name.trim() ? "#FFF" : C.textDim,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: 0.2,
                boxShadow: name.trim() ? `0 4px 16px ${C.accent}44` : "none",
                transition: "all 0.2s",
              }}
            >
              {isEdit ? "Save Changes" : "Add Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

/* ══════════════════════════════════════════
   CONFIRM DIALOG (Custom modal to replace window.confirm)
   ══════════════════════════════════════════ */
function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  const { C } = useTheme();

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface,
          borderRadius: 24,
          padding: "32px",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          textAlign: "center",
        }}
      >
        <div style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(239,68,68,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: C.danger
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 12 }}>{title}</h3>
        <p style={{ fontSize: 15, color: C.textMid, lineHeight: 1.5, marginBottom: 32 }}>{message}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: 14,
              background: C.surfaceHi,
              color: C.text,
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: 14,
              background: C.danger,
              color: "#FFF",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 16px rgba(239,68,68,0.2)",
            }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

/* ══════════════════════════════════════════
   TASK CARD
══════════════════════════════════════════ */
function TaskCard({
  task,
  entry,
  isRunning,
  elapsed,
  onToggle,
  onDelete,
  onEdit,
  onStart,
  onStop,
  onToggleStar,
  onReset,
  onPause,
  onResume,
  isSelectMode,
  isSelected,
  onSelect,
}) {
  const { C } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef(null);
  const isDone = !!entry;
  const liveMs = isRunning
    ? elapsed
    : entry
      ? entry.completedAt - entry.startedAt
      : 0;

  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  const cardStyle = {
    background: isDone ? C.bg : C.surface,
    border: `1px solid ${isDone ? "transparent" : C.border}`,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    opacity: isDone ? 0.6 : 1,
    transition: "all 0.2s ease",
  };

  return (
    <div style={cardStyle} ref={cardRef}>
      <div
        style={{
          padding: "16px",
          display: "flex",
          gap: 14,
          cursor: !isDone ? "pointer" : "default",
          position: "relative",
        }}
        onClick={() =>
          !isDone && (isSelectMode ? onSelect() : setExpanded(!expanded))
        }
      >
        {isSelectMode && !isDone && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: isSelected ? "rgba(209,62,50,0.1)" : "transparent",
              border: isSelected ? `2px solid ${C.accent}` : "none",
              borderRadius: 16,
            }}
          />
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          style={{
            zIndex: 5,
            width: 24,
            height: 24,
            borderRadius: "50%",
            flexShrink: 0,
            border: `2px solid ${isDone ? C.success : isSelectMode && isSelected ? C.accent : C.borderHi}`,
            background: isDone
              ? C.success
              : isSelectMode && isSelected
                ? C.accent
                : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          }}
        >
          {(isDone || (isSelectMode && isSelected)) && (
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 6L5 8L9 4"
                stroke="#FFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: isDone ? C.textMid : C.text,
                textDecoration: isDone ? "line-through" : "none",
              }}
            >
              {task.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar();
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: task.isStarred ? "#FFD700" : C.textDim,
                padding: 0,
              }}
            >
              {task.isStarred ? "★" : "☆"}
            </button>
          </div>

          {task.description && !isDone && (
            <div
              style={{
                fontSize: 14,
                color: C.textMid,
                marginTop: 4,
                lineHeight: "1.4",
              }}
            >
              {task.description}
            </div>
          )}

          {task.image && !isDone && (
            <img
              src={task.image}
              style={{
                width: "100%",
                maxHeight: 200,
                objectFit: "cover",
                borderRadius: 12,
                marginTop: 12,
              }}
              alt=""
            />
          )}

          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}
          >
            {task.goalMin > 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: C.textDim,
                  background: C.surfaceHi,
                  padding: "3px 10px",
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {fmtGoal(task.goalMin)}
              </div>
            )}

            {(isRunning || liveMs > 0) && (
              <div
                style={{
                  fontSize: 12,
                  color: isRunning ? C.accent : C.textDim,
                  background: isRunning ? C.accentDim : C.surfaceHi,
                  padding: "3px 10px",
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
                {isRunning ? fmtLive(liveMs) : fmtMs(liveMs)}
              </div>
            )}

            {task.reminderAt && !isDone && (
              <div
                style={{
                  fontSize: 12,
                  color: C.textDim,
                  background: C.surfaceHi,
                  padding: "3px 10px",
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {(() => {
                  // Parse as local time to avoid 8h shift
                  const [d, t] = task.reminderAt.split('T');
                  const [h, m] = t.split(':');
                  const date = new Date();
                  date.setHours(parseInt(h), parseInt(m));
                  return date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                })()}
              </div>
            )}

            {task.deadline &&
              !isDone &&
              (() => {
                const diff = Math.ceil(
                  (new Date(task.deadline + "T12:00:00") - new Date()) /
                  (1000 * 60 * 60 * 24),
                );
                if (diff > 7) return null;
                const label =
                  diff === 0
                    ? "Today"
                    : diff === 1
                      ? "Tomorrow"
                      : `${diff}d left`;
                const isUrgent = diff <= 2;
                return (
                  <div
                    style={{
                      fontSize: 12,
                      color: isUrgent ? C.danger : C.warn,
                      background: isUrgent
                        ? "rgba(239,68,68,0.08)"
                        : "rgba(249,115,22,0.08)",
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </div>
                );
              })()}

            {task.priority && !isDone && task.priority !== "mid" && (
              <div
                style={{
                  fontSize: 11,
                  color:
                    PRIORITY_OPTS.find((p) => p.id === task.priority)?.color ||
                    C.accent,
                  background: `${PRIORITY_OPTS.find((p) => p.id === task.priority)?.color || C.accent}14`,
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}
              >
                {PRIORITY_OPTS.find((p) => p.id === task.priority)?.label}
              </div>
            )}

            {task.category && !isDone && task.category !== "Quick Win" && (
              <div
                style={{
                  fontSize: 11,
                  color: C.textMid,
                  background: C.surfaceHi,
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontWeight: 500,
                }}
              >
                {task.category}
              </div>
            )}
          </div>
        </div>

        {!isDone && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                isRunning ? onStop() : onStart();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: isRunning ? C.danger : C.accent,
                color: "#FFF",
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "0.2s",
              }}
            >
              {isRunning ? "Stop" : "Start"}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && !isDone && (
          <div
            style={{
              padding: "0 16px 16px 54px",
              borderTop: `1px solid ${C.border}`,
              paddingTop: 16,
              display: "flex",
              gap: 10,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: C.surfaceHi,
                color: C.text,
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Edit
            </button>

            {liveMs > 0 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    isRunning ? onPause() : onResume();
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: isRunning ? C.surfaceHi : C.accent,
                    color: isRunning ? C.text : "#FFF",
                    border: "none",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {isRunning ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Resume
                    </>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReset();
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: C.surfaceHi,
                    color: C.text,
                    border: "none",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title="Reset timer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Reset
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "rgba(239,68,68,0.1)",
                color: C.danger,
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        )
        }
      </AnimatePresence >
    </div >
  );
}

/* ══════════════════════════════════════════
   HOME / LIST SCREEN
══════════════════════════════════════════ */
function HomeScreen({
  tasks,
  history,
  timers,
  liveTime,
  onToggle,
  onDelete,
  onStart,
  onStop,
  onReorder,
  onToggleStar,
  isWearable,
  isMobile,
  searchQuery,
  quote,
  userName,
  setTab,
  setShowSheet,
  setEditTask,
  onPause,
  onResume,
  onReset,
}) {
  const { C, isDark } = useTheme();
  const [selectedIds, setSelectedIds] = useState([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const today = todayStr();
  const todayEntries = history[today] || [];
  const completedIds = todayEntries.map((e) => e.id);
  // Also consider "once" tasks completed in past as done
  const pastEntries = Object.entries(history)
    .filter(([d]) => d < today)
    .flatMap(([, e]) => e);
  const onceCompleted = pastEntries
    .filter((e) => tasks.find((t) => t.id === e.id)?.recurrence === "once")
    .map((e) => e.id);
  const allCompletedIds = [...new Set([...completedIds, ...onceCompleted])];

  const dayOfWeek = new Date().getDay();

  const visibleTasks = tasks
    .sort((a, b) => {
      if (a.isStarred !== b.isStarred) return b.isStarred ? 1 : -1;
      return (a.order || 0) - (b.order || 0);
    })
    .filter((t) => {
      // Show if recurrence matches
      let matchesRecur = false;
      if (t.recurrence === "once") matchesRecur = true;
      if (t.recurrence === "daily") matchesRecur = true;
      if (t.recurrence === "weekdays")
        matchesRecur = dayOfWeek >= 1 && dayOfWeek <= 5;
      if (t.recurrence === "weekends")
        matchesRecur = dayOfWeek === 0 || dayOfWeek === 6;
      if (t.recurrence === "weekly") matchesRecur = true;

      // Show if deadline is in future (regardless of recur)
      if (t.deadline && t.deadline >= today) matchesRecur = true;

      return matchesRecur;
    });

  const searchFiltered = searchQuery
    ? visibleTasks.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    )
    : visibleTasks;

  const activeTasks = searchFiltered.filter(
    (t) => !allCompletedIds.includes(t.id),
  );
  const doneTasks = searchFiltered.filter((t) =>
    allCompletedIds.includes(t.id),
  );

  // Focus Mode Task
  const focusTask = focusMode
    ? activeTasks.find((t) => t.isStarred) || activeTasks[0]
    : null;

  const toggleSelect = (id) => {
    setSelectedIds((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  };

  const batchDelete = () => {
    if (confirm(`Delete ${selectedIds.length} tasks?`)) {
      selectedIds.forEach((id) => onDelete(id));
      setSelectedIds([]);
      setIsMultiSelect(false);
    }
  };

  const batchDone = () => {
    selectedIds.forEach((id) => {
      const t = tasks.find((x) => x.id === id);
      if (t && !allCompletedIds.includes(t.id)) onToggle(t);
    });
    setSelectedIds([]);
    setIsMultiSelect(false);
  };

  if (focusMode && focusTask) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          padding: 40,
          background: isDark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.95)",
          position: "fixed",
          inset: 0,
          zIndex: 200,
        }}
      >
        <button
          onClick={() => setFocusMode(false)}
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            background: C.surfaceHi,
            border: "none",
            color: C.text,
            width: 44,
            height: 44,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            cursor: "pointer",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 6L6 18M6 6l12 12"
            />
          </svg>
        </button>
        <div
          style={{
            fontSize: 13,
            color: C.accent,
            fontWeight: 800,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 24,
            opacity: 0.8,
          }}
        >
          Current Focus Area
        </div>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: C.text,
            margin: "0 0 24px 0",
            letterSpacing: -2,
          }}
        >
          {focusTask.name}
        </h1>
        {focusTask.description && (
          <p
            style={{
              fontSize: 22,
              color: C.textMid,
              maxWidth: 600,
              lineHeight: 1.6,
              marginBottom: 48,
            }}
          >
            {focusTask.description}
          </p>
        )}
        <div style={{ display: "flex", gap: 24 }}>
          <button
            onClick={() => {
              onToggle(focusTask);
              setFocusMode(false);
            }}
            style={{
              padding: "16px 32px",
              borderRadius: 100,
              background: C.success,
              color: "#FFF",
              border: "none",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: `0 10px 30px ${C.success}44`,
            }}
          >
            Mark Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: isMobile ? 80 : 0, position: "relative" }}>
      {/* Mobile Sticky Logo Header */}
      {isMobile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px 16px",
            background: C.bg,
            position: "sticky",
            top: 0,
            zIndex: 10,
            margin: "-20px -20px 20px -20px",
          }}
        >
          {/* Header branding */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            onClick={() => {
              setTab("today");
            }}
          >
            <img
              src="/logo.jpg"
              alt="Todora Logo"
              style={{ width: 24, height: 24, borderRadius: 6 }}
            />
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: C.text,
                letterSpacing: -0.5,
              }}
            >
              Todora
            </div>
          </div>
        </div>
      )}

      {/* Greeting Header */}
      {!isWearable && (
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={C.accent}
                style={{ transform: "translateY(2px)" }}
              >
                <path d="M12 2L14.39 8.26L21 9.27L16.21 13.97L17.34 20.6L12 17.27L6.66 20.6L7.79 13.97L3 9.27L9.61 8.26L12 2Z" />
              </svg>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 400,
                  color: C.text,
                  margin: 0,
                  fontFamily: "Georgia, serif",
                }}
              >
                {(() => {
                  const h = new Date().getHours();
                  if (h < 12) return "Morning";
                  if (h < 18) return "Afternoon";
                  return "Evening";
                })()}
                , {userName || "USER"}
              </h1>
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.textDim,
                marginTop: 4,
                marginLeft: 34,
              }}
            >
              {activeTasks.length} tasks remaining
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setFocusMode(true)}
              style={{
                background: C.surface,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "0.2s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
              Focus
            </button>
            <button
              onClick={() => setIsMultiSelect(!isMultiSelect)}
              style={{
                background: isMultiSelect ? C.accentDim : C.surface,
                color: isMultiSelect ? C.accent : C.text,
                border: `1px solid ${isMultiSelect ? C.accent : C.border}`,
                borderRadius: 12,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "0.2s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              {isMultiSelect ? "Cancel" : "Select"}
            </button>
          </div>
        </div>
      )}

      {isMultiSelect && selectedIds.length > 0 && (
        <div
          style={{
            position: "sticky",
            top: 10,
            zIndex: 100,
            background: C.accent,
            color: "#FFF",
            padding: "12px 20px",
            borderRadius: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            boxShadow: "0 10px 30px rgba(209,62,50,0.3)",
          }}
        >
          <span style={{ fontWeight: 700 }}>{selectedIds.length} selected</span>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={batchDone}
              style={{
                background: "#FFF",
                color: C.accent,
                border: "none",
                padding: "6px 14px",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Mark Done
            </button>
            <button
              onClick={batchDelete}
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "#FFF",
                border: "none",
                padding: "6px 14px",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {isWearable && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
            Inbox
          </span>
          <span style={{ fontSize: 14, color: C.accent }}>
            {completedIds.length}/{visibleTasks.length}
          </span>
        </div>
      )}

      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: C.text,
          marginBottom: 12,
        }}
      >
        My Projects
      </h3>
      <Reorder.Group
        axis="y"
        values={activeTasks}
        onReorder={(sorted) => {
          const other = tasks.filter(
            (t) => !activeTasks.some((at) => at.id === t.id),
          );
          onReorder([...sorted, ...other]);
        }}
        style={{ listStyle: "none", padding: 0 }}
      >
        {activeTasks.map((task) => (
          <Reorder.Item key={task.id} value={task} style={{ marginBottom: 12 }}>
            <TaskCard
              task={task}
              entry={null}
              isRunning={!!timers[task.id]}
              elapsed={liveTime[task.id] || 0}
              onToggle={() => onToggle(task)}
              onDelete={() => onDelete(task.id)}
              onEdit={() => {
                setEditTask(task);
                setShowSheet(true);
              }}
              onStart={() => onStart(task.id)}
              onStop={() => onStop(task.id)}
              onToggleStar={() => onToggleStar(task.id)}
              isSelectMode={isMultiSelect}
              isSelected={selectedIds.includes(task.id)}
              onSelect={() => toggleSelect(task.id)}
              onPause={() => onPause(task.id)}
              onResume={() => onResume(task.id)}
              onReset={() => onReset(task.id)}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button
          onClick={() => {
            setEditTask(null);
            setShowSheet(true);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            cursor: "pointer",
            background: C.surface,
            border: `1px solid ${C.borderMid}`,
            color: C.text,
            borderRadius: 12,
            fontSize: 14,
            flex: 1,
            textAlign: "left",
          }}
        >
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            width="18"
            height="18"
            style={{ color: C.accent }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add a new task...
        </button>

      </div>

      {/* Pro Tips floating card — mobile only */}
      {isMobile && quote && (
        <div
          style={{
            background: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(209,62,50,0.04)",
            border: `1px solid ${C.accentDim}`,
            borderRadius: 16,
            padding: "14px 18px",
            marginTop: 20,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.accent,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            ✦ Pro Insight
          </div>
          <div
            style={{
              fontSize: 13,
              color: C.text,
              fontStyle: "italic",
              lineHeight: 1.6,
              fontFamily: "Georgia, serif",
            }}
          >
            "{quote.text}"
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.textDim,
              marginTop: 6,
              textAlign: "right",
            }}
          >
            — {quote.author}
          </div>
        </div>
      )}

      {doneTasks.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: C.textMid,
              marginBottom: 12,
            }}
          >
            Completed
          </h3>
          {doneTasks.map((task) => {
            const entry = todayEntries.find((e) => e.id === task.id);
            return (
              <TaskCard
                key={task.id}
                task={task}
                entry={entry}
                isRunning={false}
                elapsed={0}
                onToggle={() => onToggle(task)}
                onDelete={() => onDelete(task.id)}
                onEdit={() => {
                  setEditTask(task);
                  setShowSheet(true);
                }}
                onStart={() => onStart(task.id)}
                onStop={() => onStop(task.id)}
                onToggleStar={() => onToggleStar(task.id)}
                onPause={() => onPause(task.id)}
                onResume={() => onResume(task.id)}
                onReset={() => onReset(task.id)}
              />
            );
          })}
        </div>
      )}


    </div>
  );
}

/* ══════════════════════════════════════════
   ANALYTICS (PLACEHOLDER FOR RESPONSIVE)
══════════════════════════════════════════ */
function DummyView({ title }) {
  const { C } = useTheme();
  return (
    <div style={{ color: C.text, padding: "40px 0", textAlign: "center" }}>
      <h2 style={{ fontSize: 24, fontWeight: 600 }}>{title}</h2>
      <p style={{ color: C.textDim, marginTop: 10 }}>
        View implementation hidden for brevity. Theme applies here.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════
   NAVIGATION (DESKTOP SIDEBAR + MOBILE BOTTOM)
══════════════════════════════════════════ */
function Navigation({
  tab,
  setTab,
  isMobile,
  isDark,
  toggleTheme,
  searchQuery,
  setSearchQuery,
  userEmail,
}) {
  const { C } = useTheme();
  const tabs = [
    {
      id: "today",
      label: "Today",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
        </svg>
      ),
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
        </svg>
      ),
    },
    {
      id: "notes",
      label: "Notes",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
      ),
    },
    {
      id: "analytics",
      label: "Stats",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" />
        </svg>
      ),
    },
    {
      id: "settings",
      label: "Profile",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      ),
    },
  ];

  if (isMobile) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          padding: "16px 20px 32px",
          background: `linear-gradient(to top, ${isDark ? "rgba(10,10,10,0.95)" : "rgba(248,247,244,0.95)"} 60%, transparent)`,
          pointerEvents: "none",
        }}
      >
        <div style={{
          display: "flex",
          gap: 2,
          background: isDark ? "rgba(30,30,30,0.8)" : "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px) saturate(160%)",
          borderRadius: 100,
          padding: "6px 8px",
          boxShadow: isDark
            ? "0 10px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)"
            : "0 10px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)",
          pointerEvents: "auto",
        }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? C.accent : "transparent",
                border: "none",
                borderRadius: 12,
                width: tab === t.id ? 60 : 44,
                height: 44,
                color:
                  tab === t.id
                    ? "#FFF"
                    : isDark
                      ? "rgba(255,255,255,0.5)"
                      : "rgba(0,0,0,0.4)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                boxShadow: tab === t.id ? `0 4px 12px ${C.accent}44` : "none",
              }}
            >
              <div style={{ color: "inherit", transform: tab === t.id ? "scale(1.1)" : "scale(1)" }}>{t.icon}</div>
              {tab === t.id && (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {t.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop Sidebar — seamless mode integration
  return (
    <div
      style={{
        width: 240,
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        background: C.bg,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      {/* App Logo */}
      <div
        onClick={() => setTab("today")}
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
        }}
      >
        <img
          src="/logo.jpg"
          alt="Todora Logo"
          style={{ width: 28, height: 28, borderRadius: 6 }}
        />
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: C.text,
            letterSpacing: -0.5,
          }}
        >
          Todora
        </span>
      </div>

      {/* User Header */}
      <div style={{ padding: "20px", borderBottom: `1px solid ${C.border}` }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: C.accent,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
            </div>
            <span style={{ fontWeight: 700, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userEmail || "User"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={toggleTheme}
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
                border: "none",
                color: C.textDim,
                cursor: "pointer",
                padding: 6,
                borderRadius: 8,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)",
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={C.textDim}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            value={searchQuery || ""}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 13,
              width: "100%",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* Nav Items */}
      <div
        style={{
          flex: 1,
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 12px",
              borderRadius: 10,
              background:
                tab === t.id
                  ? isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.06)"
                  : "transparent",
              color: tab === t.id ? C.text : C.textDim,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: tab === t.id ? 600 : 500,
              textAlign: "left",
              transition: "all 0.15s ease",
              letterSpacing: 0.1,
            }}
          >
            <div
              style={{
                color: tab === t.id ? C.accent : C.textDim,
                display: "flex",
                opacity: tab === t.id ? 1 : 0.6,
              }}
            >
              {t.icon}
            </div>
            {t.label}
            {tab === t.id && (
              <div
                style={{
                  marginLeft: "auto",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: C.accent,
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Bottom hint */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11,
          color: "rgba(255,255,255,0.2)",
          textAlign: "center",
        }}
      >
        Todora · v2.0
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ONBOARDING
══════════════════════════════════════════ */
function Onboarding({ onComplete, C, isDark }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");

  const steps = [
    {
      title: "Welcome to Todora",
      content: "Find your focus and reclaim your rhythm.",
      btn: "Let's Begin",
    },
    {
      title: "Clarity in Motion",
      content: "Todora is your personal space to find focus and maintain a healthy rhythm. It helps you track your daily tasks, capture wandering thoughts, and visualize your progress over time.",
      btn: "Continue",
    },
    {
      title: "What's your name?",
      content: "Personalize your journey.",
      input: true,
      btn: "Start Focusing",
    }
  ];

  const current = steps[step - 1];

  const next = () => {
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      if (!name.trim()) return;
      onComplete(name.trim().toUpperCase());
    }
  };

  const containerVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 }
  };

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        padding: 24,
      }}
    >
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        style={{
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
          padding: 40,
          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          borderRadius: 32,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        }}
      >
        <motion.div
          animate={{
            y: [0, -4, 0],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${C.accent}, #FF7A6E)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 40px",
            boxShadow: `0 20px 40px ${C.accent}44`,
            position: 'relative'
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: 24,
              border: `2px solid ${C.accent}33`,
              zIndex: -1
            }}
          />
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h1 style={{
              fontSize: 36,
              fontWeight: 900,
              color: C.text,
              marginBottom: 16,
              letterSpacing: -1.5,
              lineHeight: 1.1
            }}>
              {current.title}
            </h1>
            <p style={{
              fontSize: 17,
              color: C.textMid,
              lineHeight: 1.6,
              marginBottom: 44,
              padding: '0 10px'
            }}>
              {current.content}
            </p>

            {current.input && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                delay={0.2}
              >
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Type your name..."
                  style={{
                    width: "100%",
                    padding: "20px 24px",
                    borderRadius: 20,
                    boxSizing: "border-box",
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    border: `2px solid ${C.border}`,
                    color: C.text,
                    fontSize: 20,
                    fontWeight: 600,
                    textAlign: "center",
                    marginBottom: 32,
                    outline: "none",
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = C.accent;
                    e.target.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,1)";
                    e.target.style.boxShadow = `0 10px 30px ${C.accent}15`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = C.border;
                    e.target.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
                    e.target.style.boxShadow = "none";
                  }}
                  onKeyDown={e => e.key === "Enter" && next()}
                />
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={next}
              disabled={current.input && !name.trim()}
              style={{
                width: "100%",
                padding: "18px",
                borderRadius: 100,
                background: current.input && !name.trim() ? C.textDim : C.accent,
                color: "#FFF",
                border: "none",
                fontSize: 17,
                fontWeight: 800,
                cursor: current.input && !name.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: current.input && !name.trim() ? "none" : `0 12px 24px ${C.accent}44`,
              }}
            >
              {current.btn}
            </motion.button>
          </motion.div>
        </AnimatePresence>

        <div style={{ marginTop: 40, display: "flex", gap: 10, justifyContent: "center" }}>
          {steps.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i + 1 === step ? 24 : 8,
                background: i + 1 === step ? C.accent : C.border,
              }}
              style={{
                height: 8,
                borderRadius: 4,
                transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)"
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   ROOT APP SHELL
══════════════════════════════════════════ */
function AppContent() {
  const { C, isDark, toggleTheme, setIsDark } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();

  // Supabase data hooks
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const {
    tasks,
    loading: tasksLoading,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    // bulkUpsertTasks,
    // bulkUpsertTasks,
  } = useTasks();
  const {
    notes,
    setNotes,
    loading: notesLoading,
    addNote,
    updateNote,
    deleteNote,
    // bulkUpsertNotes,
  } = useNotes();
  const {
    history,
    loading: historyLoading,
    addHistoryEntry,
    deleteHistoryEntry,
    // bulkInsertHistory,
  } = useTaskHistory();
  // const { checkLocalData, migrateToSupabase, migrating } = useDataMigration();

  // Local state derived from profile
  const userName = profile.userName;
  const setUserName = useCallback(
    async (name) => {
      await updateProfile({ userName: name, hasOnboarded: true });
    },
    [updateProfile]
  );

  // Sync theme from profile on load (only once when profile loads)
  const [themeSynced, setThemeSynced] = useState(false);
  useEffect(() => {
    if (!profileLoading && !themeSynced && profile) {
      if (profile.isDark !== undefined) {
        setIsDark(profile.isDark);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeSynced(true);
    }
  }, [profileLoading, profile, themeSynced, setIsDark]);

  const [showSheet, setShowSheet] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Persist theme changes to profile
  const handleToggleTheme = useCallback(async () => {
    const newValue = !isDark;
    toggleTheme();
    if (user) {
      await updateProfile({ isDark: newValue });
    }
  }, [isDark, toggleTheme, updateProfile, user]);

  // Responsive breakpoints
  const [wid, setWid] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWid(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const isWearable = wid < 350;
  const isMobile = wid < 768;

  // UI State — history-aware tab management
  const [tab, setTab] = useState("today");
  const [timers, setTimers] = useState({});
  const [accumulatedMs, setAccumulatedMs] = useState({});
  const [liveTime, setLiveTime] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);

  // Initialize browser history state for the app and listen to popstate
  useEffect(() => {
    // Replace initial entry with a state that marks the base tab
    // We preserve window.location.hash here so Supabase can read the OAuth token on load.
    window.history.replaceState({ appTab: 'today' }, '', window.location.href);

    const handlePopState = (e) => {
      const appTab = e.state?.appTab;
      if (appTab) {
        setTab(appTab);
      } else {
        // Fell off the history stack — stay on today (don't let back exit the app)
        setTab('today');
        window.history.replaceState({ appTab: 'today' }, '', window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Tab navigation helper that manages the history stack
  const navigateToTab = useCallback((newTab) => {
    if (newTab === tab) return;
    window.history.pushState({ appTab: newTab }, '', window.location.pathname);
    setTab(newTab);
  }, [tab]);


  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setQuoteIndex((p) => (p + 1) % FAMOUS_QUOTES.length);
    }, 120000); // 2 minutes
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const iv = setInterval(() => {
      const now = new Date();
      const canNotify = "Notification" in window && Notification.permission === "granted";
      const todayKey = todayStr();
      tasks.forEach((t) => {
        if (t.reminderAt && t.reminderAt.includes('T')) {
          const [dPart, tPart] = t.reminderAt.split('T');
          // Only fire if the reminder date matches today
          if (dPart !== todayKey) return;
          const [rh, rm] = tPart.split(':');
          const rd = new Date();
          rd.setHours(parseInt(rh), parseInt(rm), 0, 0);

          if (Math.abs(now - rd) < 30000) {
            if (canNotify) new Notification(`Reminder: ${t.name}`);
            updateTask(t.id, { reminderAt: null });
          }
        }
        if (timers[t.id]) {
          const live = Date.now() - timers[t.id];
          if (t.goalMin > 0 && Math.abs(live - t.goalMin * 60000) < 1000) {
            if (canNotify) new Notification(`Session complete: ${t.name}`);
          }
        }
      });
    }, 10000);
    return () => clearInterval(iv);
  }, [tasks, timers, updateTask]);

  useEffect(() => {
    const ids = Array.from(new Set([...Object.keys(timers), ...Object.keys(accumulatedMs)]));
    if (!ids.length) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setLiveTime((p) => {
        const n = { ...p };
        ids.forEach((id) => {
          const acc = accumulatedMs[id] || 0;
          const start = timers[id];
          n[id] = acc + (start ? now - start : 0);
        });
        return n;
      });
    }, 500);
    return () => clearInterval(iv);
  }, [timers, accumulatedMs]);

  const TODAY = todayStr();
  const toggleTask = useCallback(
    async (task) => {
      const ents = history[TODAY] || [];
      const isDone = ents.some((e) => e.id === task.id);

      const totalMs = liveTime[task.id] || 0;

      setTimers((p) => {
        const n = { ...p };
        delete n[task.id];
        return n;
      });
      setAccumulatedMs((p) => {
        const n = { ...p };
        delete n[task.id];
        return n;
      });

      if (isDone) {
        const entryIndex = ents.findIndex((e) => e.id === task.id);
        if (entryIndex >= 0) {
          const { error } = await deleteHistoryEntry(TODAY, entryIndex);
          if (error) showToast("Failed to update task status. Please try again.");
        }
      } else {
        const completedAt = Date.now();
        const startedAt = completedAt - Math.max(500, totalMs);
        const { error } = await addHistoryEntry(task.id, task.name, startedAt, completedAt);
        if (error) showToast("Failed to save task completion. Please try again.");
      }
    },
    [history, TODAY, timers, addHistoryEntry, deleteHistoryEntry, showToast]
  );

  const onReorder = useCallback(
    async (newTasks) => {
      const { error } = await reorderTasks(newTasks);
      if (error) showToast("Failed to save task order. Please try again.");
    },
    [reorderTasks, showToast]
  );

  // Show auth screen if not logged in
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: `3px solid ${C.border}`,
              borderTopColor: C.accent,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: C.textMid, fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen theme={C} />;
  }

  const showOnboarding = !profileLoading && !userName && user;

  // Show loading while data is being fetched
  const dataLoading = profileLoading || tasksLoading || notesLoading || historyLoading;

  // isTaskOnDate is now a module-level pure function (see top of file)

  if (dataLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: `3px solid ${C.border}`,
              borderTopColor: C.accent,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: C.textMid, fontSize: 14 }}>Loading your data...</div>
        </div>
      </div>
    );
  }

  const wrapStyle = isWearable
    ? {
      background: "#000",
      minHeight: "100vh",
      padding: "30px 10px",
      color: C.text,
    }
    : isMobile
      ? {
        background: C.bg,
        height: "100%",
        padding: "20px 20px 120px",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }
      : {
        background: C.bg,
        height: "100%",
        padding: "40px 40px 80px",
        marginLeft: 240,
        paddingRight: wid > 1200 ? 300 : 40,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      };

  return (
    <ErrorBoundary FallbackComponent={({ error }) => (
      <div style={{ padding: 40, textAlign: 'center', background: C.bg, color: C.text, height: '100vh' }}>
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none' }}>
          Reload Page
        </button>
      </div>
    )}>
      {showOnboarding ? (
        <Onboarding
          isDark={isDark}
          C={C}
          onComplete={(name) => {
            setUserName(name);
            setShowOnboarding(false);
          }}
        />
      ) : (
        <div
          id="app-root"
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            backgroundColor: isWearable ? "#000" : C.bg,
            height: "100dvh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            inset: 0,
          }}
        >
          {!isWearable && <Background />}

          {/* Toast notification */}
          {toast && (
            <div
              style={{
                position: "fixed",
                top: 20,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10000,
                padding: "12px 24px",
                borderRadius: 12,
                background: toast.type === "error" ? C.danger : C.success,
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                animation: "slideDown 0.3s ease",
              }}
            >
              {toast.message}
              <style>{`@keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
            </div>
          )}

          {!isWearable && (
            <Navigation
              tab={tab}
              setTab={navigateToTab}
              isMobile={isMobile}
              isDark={isDark}
              toggleTheme={handleToggleTheme}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              userEmail={user?.email}
            />
          )}

          <div style={wrapStyle}>
            {!isMobile && wid > 1200 && (
              <div
                style={{
                  position: "fixed",
                  right: 40,
                  top: 40,
                  width: 220,
                  zIndex: 10,
                }}
              >
                <div
                  style={{ background: "transparent", padding: 0, border: "none" }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.accent,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      marginBottom: 12,
                    }}
                  >
                    Pro Insight
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      color: C.text,
                      lineHeight: 1.6,
                      fontStyle: "italic",
                      fontFamily: "'Georgia', serif",
                    }}
                  >
                    "{FAMOUS_QUOTES[quoteIndex].text}"
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textDim,
                      marginTop: 8,
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    — {FAMOUS_QUOTES[quoteIndex].author}
                  </div>
                </div>
              </div>
            )}

            <div style={{ width: "100%", position: "relative", zIndex: 10 }}>
              {tab === "today" && (
                <HomeScreen
                  tasks={tasks}
                  history={history}
                  timers={timers}
                  liveTime={liveTime}
                  searchQuery={searchQuery}
                  onToggle={toggleTask}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  onStart={(id) => setTimers((p) => ({ ...p, [id]: Date.now() }))}
                  onStop={(id) => {
                    setTimers((p) => {
                      const n = { ...p };
                      delete n[id];
                      return n;
                    });
                    setAccumulatedMs((p) => {
                      const n = { ...p };
                      delete n[id];
                      return n;
                    });
                  }}
                  onPause={(id) => {
                    const start = timers[id];
                    if (start) {
                      const diff = Date.now() - start;
                      setAccumulatedMs((p) => ({ ...p, [id]: (p[id] || 0) + diff }));
                      setTimers((p) => {
                        const n = { ...p };
                        delete n[id];
                        return n;
                      });
                    }
                  }}
                  onResume={(id) => setTimers((p) => ({ ...p, [id]: Date.now() }))}
                  onReset={(id) => {
                    setTimers((p) => {
                      const n = { ...p };
                      delete n[id];
                      return n;
                    });
                    setAccumulatedMs((p) => {
                      const n = { ...p };
                      delete n[id];
                      return n;
                    });
                  }}
                  onReorder={onReorder}
                  onToggleStar={async (id) => {
                    const task = tasks.find((t) => t.id === id);
                    if (task) {
                      const { error } = await updateTask(id, { isStarred: !task.isStarred });
                      if (error) showToast(`Update failed: ${error.message || 'Unknown error'}`, 'error');
                    }
                  }}
                  isWearable={isWearable}
                  isMobile={isMobile}
                  quoteIndex={quoteIndex}
                  quote={FAMOUS_QUOTES[quoteIndex]}
                  userName={userName}
                  setTab={navigateToTab}
                  setShowSheet={setShowSheet}
                  setEditTask={setEditTask}
                />
              )}
              {tab === "calendar" && (
                <CalendarHistory history={history} tasks={tasks} isMobile={isMobile} />
              )}
              {tab === "notes" && (
                <NotesTab
                  notes={notes}
                  setNotes={setNotes}
                  isMobile={isMobile}
                  wid={wid}
                  addNoteToDb={addNote}
                  updateNoteInDb={updateNote}
                  deleteNoteFromDb={deleteNote}
                />
              )}
              {tab === "analytics" && (
                <Analytics history={history} tasks={tasks} />
              )}
              {tab === "settings" && (
                <SettingsView
                  userName={userName}
                  setUserName={setUserName}
                  C={C}
                  isDark={isDark}
                  onSignOut={signOut}
                  userEmail={user?.email}
                  showToast={showToast}
                />
              )}
            </div>

            <AnimatePresence>
              {deleteConfirmId && (
                <ConfirmDialog
                  title="Delete Task?"
                  message="Are you sure you want to permanently delete this task? This action cannot be undone."
                  onCancel={() => setDeleteConfirmId(null)}
                  onConfirm={async () => {
                    const id = deleteConfirmId;
                    setDeleteConfirmId(null);
                    const { error } = await deleteTask(id);
                    if (error) {
                      showToast("Failed to delete task. Please try again.");
                    } else {
                      showToast("Task deleted");
                    }
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {isMobile && (
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)" }}>
              <Navigation tab={tab} setTab={navigateToTab} isMobile={true} C={C} />
            </div>
          )}

          {showSheet && (
            <TaskSheet
              task={editTask}
              onSave={async (v) => {
                if (editTask) {
                  const { error } = await updateTask(v.id, v);
                  if (error) showToast(`Update failed: ${error.message || 'Unknown error'}`, 'error');
                } else {
                  const newId = typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  const { error } = await addTask({ ...v, id: newId });
                  if (error) showToast("Failed to add task. Please try again.");
                }
                setShowSheet(false);
              }}
              onClose={() => setShowSheet(false)}
              isWearable={isWearable}
              isMobile={isMobile}
            />
          )}
        </div>
      )}
    </ErrorBoundary>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const themeTokens = useMemo(() => getTheme(isDark), [isDark]);

  return (
    <ThemeContext.Provider
      value={{
        C: themeTokens,
        isDark,
        setIsDark,
        toggleTheme: () => setIsDark((d) => !d),
      }}
    >
      <AppContent />
    </ThemeContext.Provider>
  );
}

/* ══════════════════════════════════════════
   CALENDAR HISTORY
══════════════════════════════════════════ */

function SegmentedControl({ options, value, onChange, C }) {
  return (
    <div
      style={{
        display: "flex",
        background: "rgba(255,255,255,0.05)",
        borderRadius: 100,
        padding: 3,
        border: `1px solid ${C.border}`,
        width: "fit-content",
      }}
    >
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "6px 18px",
            borderRadius: 100,
            border: "none",
            background: value === opt ? "rgba(255,255,255,0.1)" : "transparent",
            color: value === opt ? C.text : C.textDim,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "0.2s",
          }}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  );
}

/* YEAR VIEW */
function YearView({ selYear, go, C, pad, MONTHS_S, getTodayStr, isMobile }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(4, 1fr)",
        gap: isMobile ? 12 : 24,
        marginTop: 20,
      }}
    >
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(selYear, m, 1).getDay();
        const dim = new Date(selYear, m + 1, 0).getDate();
        return (
          <div
            key={m}
            style={{
              cursor: "pointer",
              background: "rgba(255,255,255,0.02)",
              padding: 8,
              borderRadius: 12,
            }}
            onClick={() => go("month", { month: m })}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.accent,
                marginBottom: 8,
                textAlign: "left",
              }}
            >
              {MONTHS_S[m].slice(0, 3)}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 1,
                marginBottom: 4,
              }}
            >
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div
                  key={d}
                  style={{ fontSize: 6, color: C.textDim, textAlign: "center" }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 1,
              }}
            >
              {Array.from({ length: 42 }).map((_, i) => {
                const dn = i - first + 1;
                if (dn < 1 || dn > dim) return <div key={i} />;
                const dk = `${selYear}-${pad(m + 1)}-${pad(dn)}`;
                const isT = dk === getTodayStr();
                return (
                  <div
                    key={i}
                    style={{
                      fontSize: 7,
                      color: isT ? "#FFF" : C.textMid,
                      textAlign: "center",
                      position: "relative",
                      background: isT ? C.accent : "transparent",
                      borderRadius: "50%",
                      width: 10,
                      height: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {dn}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* MONTH VIEW */
function MonthView({
  selYear,
  selMonth,
  go,
  pad,
  getTodayStr,
  tasks,
  history,
  MONTHS_S,
  isMobile,
}) {
  const { C } = useTheme();
  const first = new Date(selYear, selMonth, 1).getDay();
  const dim = new Date(selYear, selMonth + 1, 0).getDate();
  const weeks = Math.ceil((first + dim) / 7);
  return (
    <ErrorBoundary FallbackComponent={({ error }) => <div>MonthView Error: {error.message}</div>}>
      <div
        style={{
          background: C.surface,
          borderRadius: 24,
          padding: isMobile ? "12px" : "24px",
          border: `1px solid ${C.border}`,
          minHeight: isMobile ? "40vh" : "60vh",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 12,
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              style={{
                fontSize: 12,
                color: C.textDim,
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              {isMobile ? d.charAt(0) : d}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gridAutoRows: isMobile ? "minmax(45px, auto)" : "minmax(100px, auto)",
          }}
        >
          {Array.from({ length: weeks * 7 }).map((_, i) => {
            const dn = i - first + 1;

            const dk =
              dn >= 1 && dn <= dim
                ? `${selYear}-${pad(selMonth + 1)}-${pad(dn)}`
                : "";
            const isT = dk === getTodayStr();
            const ents = dk ? history[dk] || [] : [];

            return (
              <div
                key={i}
                style={{
                  borderRight:
                    (i + 1) % 7 === 0 ? "none" : `1px solid ${C.border}`,
                  borderBottom: `1px solid ${C.border}`,
                  padding: isMobile ? "4px" : "10px",
                  minHeight: isMobile ? 45 : 100,
                  background: dk ? "transparent" : C.bg,
                  cursor: dk ? "pointer" : "default",
                }}
                onClick={() => dk && go("day", { day: dk })}
              >
                {dk && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 11, color: C.textDim }}>
                        {dn === 1
                          ? MONTHS_S[selMonth].slice(0, 3) + " " + dn
                          : ""}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: isT ? "#FFF" : C.text,
                          background: isT ? "#D13E32" : "transparent",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {dn >= 1 && dn <= dim ? dn : ""}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      {(() => {
                        const dayTasks = tasks.filter(t => !history[dk]?.some(h => h.id === t.id) && isTaskOnDate(t, dk));
                        const allItems = [
                          ...ents.map(e => ({ ...e, type: 'history' })),
                          ...dayTasks.map(t => ({ ...t, type: 'task' }))
                        ];

                        if (isMobile) {
                          return (
                            <div
                              style={{
                                display: "flex",
                                gap: 3,
                                flexWrap: "wrap",
                                justifyContent: "center",
                              }}
                            >
                              {allItems.slice(0, 4).map((item, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: "50%",
                                    background: item.type === 'history' ? C.accent : 'rgba(209,62,50,0.4)',
                                  }}
                                />
                              ))}
                            </div>
                          );
                        }

                        return (
                          <>
                            {allItems.slice(0, 3).map((item) => {
                              const t = item.type === 'task' ? item : tasks.find((x) => x.id === item.id);
                              if (!t) return null;
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    fontSize: 9,
                                    background: item.type === 'history' ? C.accentDim : "rgba(209,62,50,0.08)",
                                    color: item.type === 'history' ? C.accent : C.text,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    border: item.type === 'task' ? `1px dashed ${C.border}` : 'none'
                                  }}
                                >
                                  {item.type === 'history' ? '★' : '○'} {t.name}
                                </div>
                              );
                            })}
                            {allItems.length > 3 && (
                              <div
                                style={{
                                  fontSize: 9,
                                  color: C.textDim,
                                  marginLeft: 4,
                                }}
                              >
                                + {allItems.length - 3} more
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ErrorBoundary>
  );
}

/* WEEK VIEW */
/* WEEK VIEW */
function WeekView({
  selYear,
  selMonth,
  selWeek,
  go,
  C,
  getTodayStr,
  DAYS_S,
  history,
  pad,
}) {
  const first = new Date(selYear, selMonth, 1).getDay();
  const dim = new Date(selYear, selMonth + 1, 0).getDate();
  const days = Array.from({ length: 7 }, (_, dow) => {
    const dn = selWeek * 7 + dow - first + 1;
    if (dn < 1 || dn > dim) return null;
    const dk = `${selYear}-${pad(selMonth + 1)}-${pad(dn)}`;
    return { dn, dk, dow };
  });

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 24,
        padding: "30px",
        border: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 16,
        }}
      >
        {days.map((item, i) => {
          if (!item) return <div key={i} />;
          const { dn, dk, dow } = item;
          const ents = history[dk] || [];
          const isT = dk === getTodayStr();
          return (
            <div
              key={dk}
              onClick={() => go("day", { day: dk })}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textDim }}>
                {DAYS_S[dow].slice(0, 3)}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: isT ? "#D13E32" : C.surfaceHi,
                  color: isT ? "#FFF" : C.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "0.2s",
                }}
              >
                {dn}
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                {ents.slice(0, 3).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: C.accent,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* DAY VIEW */
function DayView({ selDay, history, tasks, C, fmtDate, go, pad, isMobile }) {
  const entries = history[selDay] || [];
  const dateObj = fmtDate(selDay);
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth();
  const first = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, minHeight: "80vh" }}>
      {/* Left: Header + Timeline */}
      <div style={{ flex: "1 1 300px", minWidth: 0 }}>
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: C.text,
              margin: 0,
              letterSpacing: -0.5,
            }}
          >
            {dateObj.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
            , <span style={{ color: C.textMid, fontWeight: 300 }}>{y}</span>
          </h1>
          <div
            style={{
              fontSize: 16,
              color: C.textMid,
              fontWeight: 400,
              marginTop: 4,
            }}
          >
            {dateObj.toLocaleDateString("en-US", { weekday: "long" })}
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10,
            padding: "8px 16px",
            marginBottom: 2,
            fontSize: 12,
            color: C.textDim,
          }}
        >
          all-day
        </div>
        <div
          style={{ borderTop: `1px solid ${C.border}`, position: "relative" }}
        >
          {Array.from({ length: 13 }, (_, i) => {
            const h = i + 11;
            const label =
              h === 12 ? "Noon" : h > 12 ? `${h - 12} PM` : `${h} AM`;
            return (
              <div
                key={h}
                style={{
                  display: "flex",
                  minHeight: 60,
                  borderBottom: `1px solid ${C.border}`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 72,
                    flexShrink: 0,
                    fontSize: 11,
                    color: C.textDim,
                    paddingTop: 10,
                    fontWeight: 700,
                    textAlign: "right",
                    paddingRight: 14,
                  }}
                >
                  {label}
                </div>
                <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
                  {(() => {
                    const hEnts = entries.filter(e => {
                      const hr = e.completedAt ? new Date(e.completedAt).getHours() : -1;
                      return hr === h;
                    }).map(e => ({ ...e, type: 'history' }));

                    const sTasks = tasks.filter(t => {
                      if (!isTaskOnDate(t, selDay)) return false;
                      if (!t.reminderAt) return false;
                      const thr = parseInt(t.reminderAt.split('T')[1].split(':')[0]);
                      return thr === h;
                    }).map(t => ({ ...t, type: 'task' }));

                    const all = [...hEnts, ...sTasks];

                    return all.map((item, idx) => {
                      const task = item.type === 'task' ? item : (tasks || []).find(t => t.id === item.id);
                      const isHist = item.type === 'history';
                      let time = '';
                      if (isHist) {
                        time = item.completedAt ? new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                      } else if (item.reminderAt && item.reminderAt.includes('T')) {
                        // Parse as local time string to avoid UTC shift
                        const [, tPart] = item.reminderAt.split('T');
                        const [rh, rm] = tPart.split(':');
                        const localD = new Date();
                        localD.setHours(parseInt(rh), parseInt(rm));
                        time = localD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }

                      return (
                        <div
                          key={item.id || idx}
                          style={{
                            position: "relative",
                            marginTop: 4,
                            marginBottom: 4,
                            left: 4,
                            right: 4,
                            background: isHist ? C.accentDim : "rgba(209,62,50,0.05)",
                            borderLeft: `4px solid ${isHist ? C.accent : 'rgba(209,62,50,0.4)'}`,
                            borderRadius: 6,
                            padding: "8px 10px",
                            border: !isHist ? `1px dashed ${C.border}` : 'none',
                            borderLeftWidth: 4,
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: isHist ? C.accent : C.text }}>
                            {task ? task.name : `Task #${item.id}`}
                          </div>
                          {time && <div style={{ fontSize: 11, color: isHist ? C.accent : C.textDim, opacity: 0.7 }}>{isHist ? 'Done at ' : 'Reminder: '}{time}</div>}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Mini-calendar — hidden on narrow screens */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          borderLeft: `1px solid ${C.border}`,
          paddingLeft: 20,
          display: isMobile ? "none" : "block",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              width: "100%",
            }}
          >
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <div
                key={d}
                style={{
                  fontSize: 9,
                  color: C.textDim,
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                {d}
              </div>
            ))}
            {Array.from({ length: 42 }).map((_, i) => {
              const dn = i - first + 1;
              if (dn < 1 || dn > dim) return <div key={i} />;
              const dk = `${y}-${pad(m + 1)}-${pad(dn)}`;
              const active = dk === selDay;
              return (
                <div
                  key={i}
                  onClick={() => go("day", { day: dk })}
                  style={{
                    fontSize: 10,
                    color: active ? "#FFF" : C.text,
                    textAlign: "center",
                    cursor: "pointer",
                    background: active ? C.accent : "transparent",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {dn}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div style={{ fontSize: 16, color: C.borderMid, fontWeight: 300 }}>
            No Event Selected
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarHistory({ history, tasks, isMobile }) {
  const { C } = useTheme();
  const [level, setLevel] = useState("month");
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selWeek, setSelWeek] = useState(0);
  const [selDay, setSelDay] = useState(todayStr());

  const YEARS = useMemo(
    () => Array.from({ length: 2100 - 2024 + 1 }, (_, i) => 2024 + i),
    [],
  );

  const go = (newLevel, data = {}) => {
    if (data.year !== undefined) setSelYear(data.year);
    if (data.month !== undefined) setSelMonth(data.month);
    if (data.week !== undefined) setSelWeek(data.week);
    if (data.day !== undefined) setSelDay(data.day);
    setLevel(newLevel);
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          marginBottom: 24,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: isMobile ? 22 : 32,
              fontWeight: 800,
              color: C.text,
              margin: 0,
            }}
          >
            {level === "year"
              ? selYear
              : level === "month"
                ? MONTHS_S[selMonth] + " " + selYear
                : level === "day"
                  ? fmtDate(selDay).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })
                  : "Calendar"}
          </h1>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                if (level === "year") setSelYear((p) => p - 1);
                else setSelMonth((p) => (p === 0 ? 11 : p - 1));
              }}
              style={{
                background: C.surfaceHi,
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                cursor: "pointer",
                color: C.text,
                fontSize: 14,
              }}
            >
              ‹
            </button>
            <button
              onClick={() => {
                if (level === "year") setSelYear((p) => p + 1);
                else setSelMonth((p) => (p === 11 ? 0 : p + 1));
              }}
              style={{
                background: C.surfaceHi,
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                cursor: "pointer",
                color: C.text,
                fontSize: 14,
              }}
            >
              ›
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setSelYear(now.getFullYear());
                setSelMonth(now.getMonth());
                setSelDay(todayStr());
                const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
                setSelWeek(Math.floor((firstOfMonth + now.getDate() - 1) / 7));
              }}
              style={{
                background: C.surfaceHi,
                border: "none",
                borderRadius: 8,
                padding: "0 12px",
                height: 30,
                cursor: "pointer",
                color: C.text,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Today
            </button>
          </div>
        </div>
        <SegmentedControl
          options={["day", "week", "month", "year"]}
          value={level}
          onChange={setLevel}
          C={C}
        />
      </div>

      <div style={{ minHeight: "70vh" }}>
        {level === "year" && (
          <YearView
            selYear={selYear}
            go={go}
            C={C}
            pad={pad}
            MONTHS_S={MONTHS_S}
            getTodayStr={todayStr}
            isMobile={isMobile}
          />
        )}
        {level === "month" && (
          <MonthView
            selYear={selYear}
            selMonth={selMonth}
            go={go}
            C={C}
            pad={pad}
            getTodayStr={todayStr}
            tasks={tasks}
            history={history}
            MONTHS_S={MONTHS_S}
            isMobile={isMobile}
          />
        )}
        {level === "week" && (
          <WeekView
            selYear={selYear}
            selMonth={selMonth}
            selWeek={selWeek}
            go={go}
            C={C}
            getTodayStr={todayStr}
            DAYS_S={DAYS_S}
            history={history}
            pad={pad}
          />
        )}
        {level === "day" && (
          <DayView
            selDay={selDay}
            history={history}
            tasks={tasks}
            C={C}
            fmtDate={fmtDate}
            go={go}
            pad={pad}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════ */
function PerformanceTiles({ history, tasks, period, getTodayStr }) {
  const { C, isDark } = useTheme();
  const [viewState, setViewState] = useState(period); // "week", "month", "year"

  // Constrain colors to exactly 3 bands + empty state
  const getColor = (p, k) => {
    const kToday = getTodayStr ? getTodayStr() : new Date().toISOString().split("T")[0];
    if (k && k > kToday) return isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";

    if (p === 0) return isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
    if (p < 0.33) return "#FFC1C1"; // Soft Red
    if (p < 0.66) return "#FFDBA0"; // Soft Orange
    return "#B8EDB8"; // Soft Green
  };

  // Helper arrays
  const DAYS_MIN = ["S", "M", "T", "W", "T", "F", "S"];
  const MONTHS_LBL = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const buildMonthGrid = (year, monthIdx) => {
    const fday = new Date(year, monthIdx, 1).getDay();
    const mdays = new Date(year, monthIdx + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < fday; i++) cells.push(null); // padding
    for (let d = 1; d <= mdays; d++) {
      const pad = (n) => n.toString().padStart(2, "0");
      const k = `${year}-${pad(monthIdx + 1)}-${pad(d)}`;
      const ents = history[k] || [];
      const pct = tasks.length > 0 ? ents.length / tasks.length : 0;
      cells.push({ dayStr: d, pct });
    }
    return cells;
  };

  const getDayLabel = (dateKey) => {
    return parseInt(dateKey.split("-")[2], 10);
  };
  const getWeekDays = () => {
    const today = new Date();
    // 0 = Sun, 1 = Mon, etc.
    const dayOfWeek = today.getDay();
    // Shift the date back to Sunday locally
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);

    const ds = [];
    const pad = (n) => n.toString().padStart(2, "0");
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const ents = history[k] || [];
      const pct = tasks.length > 0 ? ents.length / tasks.length : 0;
      ds.push({ k, pct });
    }
    return ds;
  };

  const getMonthDays = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const ds = [];

    // Push empty objects for padding spaces
    for (let i = 0; i < firstDay; i++) ds.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const pad = (n) => n.toString().padStart(2, "0");
      const k = `${year}-${pad(month + 1)}-${pad(d)}`;
      const ents = history[k] || [];
      const pct = tasks.length > 0 ? ents.length / tasks.length : 0;
      ds.push({ k, pct });
    }
    return ds;
  };



  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
          Performance
        </div>
        <SegmentedControl
          options={["week", "month", "year"]}
          value={viewState}
          onChange={setViewState}
          C={C}
        />
      </div>

      {viewState === "year" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "24px 32px",
            width: "100%",
            marginTop: 12,
            maxHeight: 400,
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: 4,
            paddingBottom: 24,
          }}
        >
          {Array.from({ length: 12 }).map((_, mIdx) => {
            const y = new Date().getFullYear();
            const cells = buildMonthGrid(y, mIdx);
            return (
              <div key={mIdx}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: C.text,
                    marginBottom: 12,
                  }}
                >
                  {MONTHS_LBL[mIdx]}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  {DAYS_MIN.map((d, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: 10,
                        color: C.textDim,
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 6,
                  }}
                >
                  {cells.map((c, i) => {
                    if (!c) return <div key={i} />;
                    const cellKey = `${y}-${pad(mIdx + 1)}-${pad(c.dayStr)}`;
                    const isCellToday = cellKey === todayStr();
                    return (
                      <div
                        key={i}
                        title={`${c.pct > 0 ? Math.round(c.pct * 100) + "%" : "0%"}`}
                        style={{
                          aspectRatio: "1/1",
                          borderRadius: 4,
                          background: getColor(c.pct, cellKey),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          color:
                            c.pct > 0
                              ? c.pct < 0.66 && c.pct >= 0.33
                                ? "#8C5E00"
                                : "#A61414"
                              : C.textDim,
                          fontWeight: isCellToday ? 800 : (c.pct > 0 ? 700 : 500),
                          border: isCellToday ? `2px solid ${C.accent}` : "none",
                        }}
                      >
                        {c.dayStr}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewState === "month" && (
        <div style={{ width: "100%", marginTop: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {DAYS_MIN.map((d, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: 10,
                  color: C.textDim,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
            }}
          >
            {getMonthDays(new Date().getFullYear(), new Date().getMonth()).map(
              (c, i) => {
                if (!c) return <div key={i} />;
                const isToday = c.k === todayStr();
                return (
                  <div
                    key={i}
                    title={`${c.pct > 0 ? Math.round(c.pct * 100) + "%" : "0%"}`}
                    style={{
                      aspectRatio: "1/1",
                      borderRadius: 4,
                      background: getColor(c.pct, c.k),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color:
                        c.pct > 0
                          ? c.pct < 0.66 && c.pct >= 0.33
                            ? "#8C5E00"
                            : "#A61414"
                          : C.textDim,
                      fontWeight: c.pct > 0 ? 700 : 500,
                      border: isToday ? `2px solid ${C.accent}` : "none",
                    }}
                  >
                    {getDayLabel(c.k)}
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {viewState === "week" && (
        <div style={{ width: "100%", marginTop: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {DAYS_MIN.map((d, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: 10,
                  color: C.textDim,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
            }}
          >
            {getWeekDays().map((c, i) => {
              const isToday = c.k === todayStr();
              return (
                <div
                  key={i}
                  title={`${c.pct > 0 ? Math.round(c.pct * 100) + "%" : "0%"}`}
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: 4,
                    background: getColor(c.pct, c.k),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color:
                      c.pct > 0
                        ? c.pct < 0.66 && c.pct >= 0.33
                          ? "#8C5E00"
                          : "#A61414"
                        : C.textDim,
                    fontWeight: c.pct > 0 ? 700 : 500,
                    border: isToday ? `2px solid ${C.accent}` : "none",
                  }}
                >
                  {getDayLabel(c.k)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════
   ANALYTICS (BOTTOM SECTION)
══════════════════════════════════════════ */
export function Analytics({ history, tasks }) {
  const { C, isDark } = useTheme();
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const streak = useMemo(() => calcStreak(history), [history]);
  const best = useMemo(() => calcBestStreak(history), [history]);
  const totalDone = useMemo(() => Object.values(history).reduce((a, b) => a + b.length, 0), [history]);
  const totalTime = useMemo(() => calcTotalTime(history), [history]);

  const stats = [
    { label: "STREAK", val: `${streak}d`, g: C.accent },
    { label: "BEST", val: `${best}d`, g: C.text },
    { label: "COMPLETED", val: totalDone, g: C.success },
    { label: "TIME LOGGED", val: totalTime >= 60 ? `${Math.floor(totalTime / 60)}h ${totalTime % 60}m` : `${totalTime}m`, g: C.textMid }
  ];

  const barCount = isMobile ? 21 : 40;

  return (
    <div style={{ padding: isMobile ? 16 : 24, paddingBottom: 100 }}>
      {/* Top Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: isMobile ? 10 : 16,
        marginBottom: isMobile ? 12 : 16
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: C.surface,
            borderRadius: isMobile ? 16 : 20,
            padding: isMobile ? 16 : 24,
            border: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}>
            <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, color: s.g, fontFamily: "Inter, sans-serif" }}>
              {s.val === 0 || s.val === "0d" ? "—" : s.val}
            </div>
            <div style={{
              fontSize: isMobile ? 9 : 10,
              fontWeight: 700,
              color: C.textDim,
              letterSpacing: 1.5,
              marginTop: 4,
              textTransform: "uppercase"
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Tiles (Consistency Calendar) */}
      <div style={{
        background: C.surface,
        borderRadius: isMobile ? 16 : 24,
        padding: isMobile ? 16 : 24,
        border: `1px solid ${C.border}`,
        marginBottom: isMobile ? 12 : 24
      }}>
        <PerformanceTiles history={history} tasks={tasks} period="month" />
      </div>

      {/* Engagement Trend */}
      <div style={{
        background: C.surface,
        borderRadius: isMobile ? 16 : 24,
        padding: isMobile ? 16 : 24,
        border: `1px solid ${C.border}`
      }}>
        <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>Engagement</div>
        <div style={{ fontSize: isMobile ? 12 : 13, color: C.textDim, marginBottom: isMobile ? 12 : 20 }}>Daily activity trend</div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 2 : 3, height: isMobile ? 80 : 100, paddingBottom: 8 }}>
          {Array.from({ length: barCount }).map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (barCount - 1 - i));
            const k = d.toISOString().split("T")[0];
            const count = (history[k] || []).length;
            const h = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
            return (
              <div
                key={i}
                title={`${k}: ${count} tasks`}
                style={{
                  flex: 1,
                  height: `${Math.max(4, h)}%`,
                  background: count > 0 ? C.accent : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                  borderRadius: 2,
                  transition: "0.3s"
                }}
              />
            );
          })}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textDim, fontWeight: 700, opacity: 0.8 }}>
          {(() => {
            const markers = [];
            const now = new Date();
            const start = new Date(); start.setDate(now.getDate() - (barCount - 1));
            markers.push(start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase());
            const mid = new Date(); mid.setDate(now.getDate() - Math.floor(barCount / 2));
            markers.push(mid.toLocaleDateString('en-US', { month: 'short' }).toUpperCase());
            markers.push("TODAY");
            return markers.map((m, idx) => <span key={idx}>{m}</span>);
          })()}
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════
   NOTES TAB
══════════════════════════════════════════ */
export function NotesTab({ notes, setNotes, isMobile, wid, addNoteToDb, updateNoteInDb, deleteNoteFromDb }) {
  const { C, isDark } = useTheme();
  const [activeId, setActiveId] = useState(notes[0]?.id || null);
  const [showList, setShowList] = useState(true);
  const [isPenEnabled, setIsPenEnabled] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const editorRef = useRef(null);

  const activeNote = notes.find((n) => n.id === activeId);

  const updateActive = useCallback(async (upd) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === activeId ? { ...n, ...upd } : n)),
    );
    if (updateNoteInDb && activeId) {
      await updateNoteInDb(activeId, upd);
    }
  }, [activeId, setNotes, updateNoteInDb]);

  // Click-away listener for dropdown menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // Auto-delete empty notes when navigating away - defined before useEffect that uses it
  const cleanEmptyNotes = useCallback(async () => {
    const emptyNotes = notes.filter((n) => !n.title?.trim() && !n.content?.trim() && !n.drawing && !n.image);
    for (const note of emptyNotes) {
      if (deleteNoteFromDb) {
        await deleteNoteFromDb(note.id);
      }
    }
    setNotes((prev) => prev.filter((n) => n.title?.trim() || n.content?.trim() || n.drawing || n.image));
  }, [notes, setNotes, deleteNoteFromDb]);

  // Store ref to notes for cleanup - avoids stale closure issue
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Clean empty notes on unmount - use sync version with ref to avoid async issues
  useEffect(() => {
    return () => {
      const currentNotes = notesRef.current;
      const emptyNotes = currentNotes.filter((n) => !n.title?.trim() && !n.content?.trim() && !n.drawing && !n.image);
      emptyNotes.forEach((note) => {
        if (deleteNoteFromDb) {
          deleteNoteFromDb(note.id);
        }
      });
    };
  }, [deleteNoteFromDb]);

  const addNote = async () => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const n = {
      id: newId,
      title: "",
      content: "",
      drawing: null,
      image: null,
      date: new Date().toLocaleDateString(),
      isStarred: false,
    };
    if (addNoteToDb) {
      const { data } = await addNoteToDb(n);
      if (data) {
        setActiveId(data.id);
        if (isMobile) setShowList(false);
        return;
      }
    }
    setNotes([n, ...notes]);
    setActiveId(n.id);
    if (isMobile) setShowList(false);
  };

  const deleteNote = async (idToDelete) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      if (deleteNoteFromDb) {
        await deleteNoteFromDb(idToDelete);
      } else {
        setNotes((prev) => prev.filter((n) => n.id !== idToDelete));
      }
      if (activeId === idToDelete) {
        setActiveId(notes.length > 1 ? notes.find(n => n.id !== idToDelete)?.id : null);
      }
    }
  };

  const switchNote = (id) => {
    cleanEmptyNotes();
    setActiveId(id);
    if (isMobile) setShowList(false);
  };

  const goBackToList = () => {
    cleanEmptyNotes();
    setShowList(true);
  };

  const onPaste = (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.includes("image")) {
        e.preventDefault();
        const f = item.getAsFile();
        const r = new FileReader();
        r.onload = (ex) => updateActive({ image: ex.target.result });
        r.readAsDataURL(f);
        return;
      }
    }
  };

  // Rich text commands
  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) execCmd("createLink", url);
  };


  // Export note as PDF
  const exportPDF = () => {
    if (!activeNote) return;
    const doc = new jsPDF();
    const title = activeNote.title || "Untitled";
    const text = editorRef.current?.innerText || "";

    doc.setFontSize(20);
    doc.text(title, 10, 20);
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(text, 180);
    doc.text(splitText, 10, 35);
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  };

  // Share note
  const shareNote = () => {
    if (!activeNote) return;
    const text = `${activeNote.title || "Untitled"}\n\n${activeNote.content || (editorRef.current?.innerText || "")}`;
    if (navigator.share) {
      navigator.share({ title: activeNote.title || "Note", text });
    } else {
      navigator.clipboard.writeText(text);
      alert("Note copied to clipboard!");
    }
  };

  // Copy note to clipboard
  const copyNote = () => {
    if (!activeNote) return;
    if (editorRef.current) {
      const text = editorRef.current.innerText;
      navigator.clipboard.writeText(text).then(() => {
        alert("Copied to clipboard!");
      });
    }
  };

  // Sync contentEditable to note state on input
  const handleEditorInput = () => {
    if (editorRef.current) {
      updateActive({ content: editorRef.current.innerHTML });
    }
  };

  // Load content into editor when note changes
  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content || "";
      }
    }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps



  // Font options
  const FONTS = ["Inter", "Georgia", "Courier New", "Arial", "Verdana", "Times New Roman"];
  const SIZES = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* Note List Sidebar */}
      {(!isMobile || showList) && (
        <div style={{
          width: isMobile ? "100%" : 280,
          flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          background: C.bgAlt,
        }}>
          <div style={{
            padding: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Notes</div>
            <button onClick={addNote} style={{
              background: C.accent,
              color: "#FFF",
              border: "none",
              padding: "6px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {notes.map((n) => (
              <div
                key={n.id}
                onClick={() => switchNote(n.id)}
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${C.border}`,
                  cursor: "pointer",
                  background: n.id === activeId ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)") : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "0.15s",
                }}
              >
                <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    {n.isStarred && <span style={{ color: C.accent, marginRight: 4 }}>★</span>}
                    {n.title || "Untitled"}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{n.date}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.textDim,
                    cursor: "pointer",
                    padding: 4,
                    borderRadius: 4,
                    fontSize: 14,
                    opacity: 0.5,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note Editor */}
      {(!showList || !isMobile) && activeNote && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
          {/* Header: Back + Title + Actions */}
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            {isMobile && (
              <button onClick={goBackToList} style={{ background: "none", border: "none", color: C.text, fontSize: 20, cursor: "pointer", padding: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            )}
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => updateActive({ title: e.target.value })}
              placeholder="Note Title"
              style={{
                flex: 1,
                background: "none",
                border: "none",
                fontSize: 18,
                fontWeight: 700,
                color: C.text,
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 2, alignItems: "center", position: "relative" }}>
              {/* Primary Header Actions */}
              <button
                onClick={() => updateActive({ isStarred: !activeNote.isStarred })}
                title="Star"
                style={{ background: "none", border: "none", cursor: "pointer", color: activeNote.isStarred ? C.accent : C.textDim, padding: 6 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={activeNote.isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              </button>

              <button onClick={copyNote} title="Copy Content" style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              </button>

              <button onClick={exportPDF} title="Download PDF" style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              </button>

              <button onClick={shareNote} title="Share" style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, padding: 6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
              </button>

              <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }} />

              {/* Formatting Tools Dropdown Trigger */}
              <button
                onClick={() => setShowMenu(!showMenu)}
                title="Formatting Options"
                style={{
                  background: showMenu ? C.border : "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.textDim,
                  padding: 8,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s"
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
              </button>

              {showMenu && (
                <div
                  ref={menuRef}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 8,
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                    zIndex: 200,
                    minWidth: 180,
                    overflow: "hidden",
                    padding: 8
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, padding: "4px 10px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>Formatting</div>

                  {[
                    { cmd: "bold", label: "Bold", icon: <b>B</b> },
                    { cmd: "italic", label: "Italic", icon: <i>I</i> },
                    { cmd: "underline", label: "Underline", icon: <u>U</u> },
                    { cmd: "strikeThrough", label: "Strike", icon: <s>S</s> },
                    "sep",
                    { cmd: "justifyLeft", label: "Align Left", icon: "⫷" },
                    { cmd: "justifyCenter", label: "Align Center", icon: "⫸" },
                    { cmd: "justifyRight", label: "Align Right", icon: "⫸" },
                    "sep",
                    { cmd: "insertUnorderedList", label: "Bullets", icon: "•" },
                    { cmd: "insertOrderedList", label: "Numbers", icon: "1." },
                    { cmd: "link", label: "Insert Link", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> },
                    "sep",
                    {
                      label: "Font Family",
                      custom: (
                        <select
                          onChange={(e) => { execCmd("fontName", e.target.value); setShowMenu(false); }}
                          style={{ width: "100%", padding: 6, borderRadius: 6, background: C.surfaceHi, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontWeight: 600 }}
                        >
                          <option value="">Font Family</option>
                          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      )
                    },
                    {
                      label: "Font Size",
                      custom: (
                        <select
                          onChange={(e) => { execCmd("fontSize", e.target.value); setShowMenu(false); }}
                          style={{ width: "100%", padding: 6, borderRadius: 6, background: C.surfaceHi, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontWeight: 600 }}
                        >
                          <option value="">Font Size</option>
                          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )
                    }
                  ].map((item, idx) => {
                    if (item === "sep") return <div key={idx} style={{ height: 1, background: C.border, margin: "4px 4px" }} />;
                    if (item.custom) return <div key={idx} style={{ padding: "4px 12px" }}>{item.custom}</div>;
                    return (
                      <button
                        key={idx}
                        onMouseDown={(e) => { e.preventDefault(); item.cmd === "link" ? insertLink() : execCmd(item.cmd); setShowMenu(false); }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          color: C.text,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          borderRadius: 8,
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.background = C.border}
                        onMouseLeave={(e) => e.target.style.background = "none"}
                      >
                        <span style={{ width: 16, display: "flex", justifyContent: "center", opacity: 0.7 }}>{item.icon}</span>
                        {item.label}
                      </button>
                    );
                  })}

                  <div style={{ height: 1, background: C.border, margin: "8px 4px" }} />
                  <button
                    onClick={() => { deleteNote(activeId); setShowMenu(false); }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      color: C.danger,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      borderRadius: 8,
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.background = C.accentDim}
                    onMouseLeave={(e) => e.target.style.background = "none"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    Delete Note
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Note Controls Placeholder (Toolbar moved to dropdown) */}
          <div style={{ height: 1, background: C.border }} />
          {!isPenEnabled && (
            <div style={{
              padding: "6px 12px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "center",
              background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
            }}>
              {/* Drawing + Image toggles */}
              <button
                onClick={() => { setIsPenEnabled(!isPenEnabled); setIsEraser(false); }}
                title="Draw"
                style={{
                  background: isPenEnabled ? C.accentDim : "none",
                  border: "none",
                  color: isPenEnabled ? C.accent : C.textDim,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>
              </button>
              <label title="Insert Image" style={{ cursor: "pointer", color: C.textDim, padding: "4px 8px", display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                <input type="file" accept="image/*" hidden onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const r = new FileReader();
                    r.onload = (ev) => updateActive({ image: ev.target.result });
                    r.readAsDataURL(file);
                  }
                }} />
              </label>
            </div>
          )}

          {/* Drawing toolbar */}
          {isPenEnabled && (
            <div style={{
              padding: "8px 12px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
            }}>
              <button onClick={() => setIsEraser(false)} style={{ background: !isEraser ? C.accentDim : "none", border: "none", color: !isEraser ? C.accent : C.textDim, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                ✏️ Pen
              </button>
              <button onClick={() => setIsEraser(true)} style={{ background: isEraser ? C.accentDim : "none", border: "none", color: isEraser ? C.accent : C.textDim, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                🧹 Eraser
              </button>
              <button onClick={() => { if (window.confirm("Clear all drawing?")) updateActive({ drawing: null }); }} style={{ background: "none", border: "none", color: C.danger, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                🗑️ Clear
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={() => { setIsPenEnabled(false); setIsEraser(false); }} style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                Done
              </button>
            </div>
          )}

          {/* Content Area */}
          <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
            {/* Image */}
            {activeNote.image && (
              <div style={{ padding: 16, position: "relative" }}>
                <img src={activeNote.image} alt="Note" style={{ maxWidth: "100%", height: "auto", borderRadius: 12 }} />
                <button onClick={() => updateActive({ image: null })} style={{
                  position: "absolute", top: 20, right: 20, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
                }}>×</button>
              </div>
            )}

            {/* Drawing Canvas */}
            {isPenEnabled && (
              <div style={{ padding: 16 }}>
                <ScribbleCanvas
                  initialDrawing={activeNote.drawing}
                  onSave={(drawing) => updateActive({ drawing })}
                  width={isMobile ? wid - 32 : 800}
                  height={isMobile ? 300 : 400}
                  isPenEnabled={!isEraser}
                />
              </div>
            )}

            {/* Rich Text Editor (contentEditable) */}
            {!isPenEnabled && (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onPaste={onPaste}
                data-placeholder="Start writing..."
                style={{
                  padding: 20,
                  minHeight: "60vh",
                  fontSize: 16,
                  lineHeight: 1.7,
                  color: C.text,
                  outline: "none",
                  fontFamily: "Inter, sans-serif",
                }}
              />
            )}

            {/* Show saved drawing inline when not in pen mode */}
            {!isPenEnabled && activeNote.drawing && (
              <div style={{ padding: 16 }}>
                <img src={activeNote.drawing} alt="Drawing" style={{ maxWidth: "100%", borderRadius: 12, border: `1px solid ${C.border}` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty States */}
      {!activeNote && notes.length > 0 && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 18, fontWeight: 500 }}>
          Select a note to begin writing
        </div>
      )}
      {notes.length === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginTop: 20, letterSpacing: -0.5 }}>
            No Notes Yet
          </div>
          <p style={{ color: C.textDim, marginTop: 8, fontSize: 15, textAlign: "center" }}>
            Create your first note to start writing.
          </p>
          <button onClick={addNote} style={{
            marginTop: 24, background: C.accent, color: "#FFF", border: "none", padding: "12px 32px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 15,
          }}>
            Create Note
          </button>
        </div>
      )}
    </div>
  );
}








function ScribbleCanvas({
  initialDrawing,
  onSave,
  width = 800,
  height = 400,
  isPenEnabled,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { C, isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = C.text; // Use C.text for stroke color
    ctx.lineWidth = 3;

    // Clear canvas and load initial drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (initialDrawing) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = initialDrawing;
    }
  }, [initialDrawing, C.text]);

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (event) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(event);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (event) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(event);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL());
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: height,
        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
        borderRadius: 20,
        border: `1px solid ${C.border}`,
        cursor: isPenEnabled ? "crosshair" : "default",
        touchAction: "none", // Prevent scrolling on touch devices
        overflow: "hidden", // Hide overflow if canvas is larger than container
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{ display: "block" }} // Remove extra space below canvas
      />
    </div>
  );
}

/* ══════════════════════════════════════════
   SETTINGS VIEW
══════════════════════════════════════════ */
function SettingsView({ userName, setUserName, C, onSignOut, userEmail, showToast }) {
  const [name, setName] = useState(userName);

  const save = async () => {
    if (!name.trim()) { if (showToast) showToast("Name cannot be empty", "error"); return; }
    await setUserName(name.trim().toUpperCase());
    if (showToast) showToast("Profile updated!");
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto", paddingBottom: 100 }}>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: C.text,
          marginBottom: 32,
          fontFamily: "Georgia, serif",
        }}
      >
        Settings
      </h1>

      <div
        style={{
          background: C.surface,
          borderRadius: 24,
          padding: 32,
          border: `1px solid ${C.border}`,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            marginBottom: 24,
          }}
        >
          Profile
        </h2>

        <label
          style={{
            display: "block",
            fontSize: 13,
            color: C.textDim,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Display Name
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "12px 20px",
              borderRadius: 12,
              background: C.surfaceUp,
              border: `1px solid ${C.border}`,
              color: C.text,
              fontSize: 16,
              outline: "none",
            }}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <button
            onClick={save}
            style={{
              padding: "12px 24px",
              borderRadius: 100,
              background: C.accent,
              color: "#FFF",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Account Section */}
      <div
        style={{
          marginTop: 24,
          background: C.surface,
          borderRadius: 24,
          padding: 32,
          border: `1px solid ${C.border}`,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            marginBottom: 24,
          }}
        >
          Account
        </h2>
        {userEmail && (
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: C.textDim,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Email
            </label>
            <div style={{ color: C.text, fontSize: 15 }}>{userEmail}</div>
          </div>
        )}
        {onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              padding: "12px 24px",
              borderRadius: 100,
              background: C.surfaceUp,
              color: C.text,
              border: `1px solid ${C.border}`,
              fontWeight: 700,
              cursor: "pointer",
              transition: "0.2s",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
            Sign Out
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: 24,
          background: "rgba(239, 68, 68, 0.05)",
          borderRadius: 24,
          padding: 32,
          border: `1px solid rgba(239, 68, 68, 0.1)`,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#EF4444",
            marginBottom: 24,
          }}
        >
          Danger Zone
        </h2>
        <button
          onClick={() => {
            if (
              confirm(
                "Are you sure you want to clear all local data? This cannot be undone.",
              )
            ) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          style={{
            padding: "12px 24px",
            borderRadius: 100,
            background: "transparent",
            color: "#EF4444",
            border: "1px solid #EF4444",
            fontWeight: 700,
            cursor: "pointer",
            transition: "0.2s",
          }}
        >
          Clear Local Cache
        </button>
      </div>
    </div>
  );
}
