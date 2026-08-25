import { useState, useCallback, useMemo, useEffect, useRef } from "react";

// ── ICONS ──────────────────────────────────────────────────────────────────────
function makeIcon(paths) {
  return function IconComp({ size = 16, color = "currentColor", strokeWidth = 2, className }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        {paths}
      </svg>
    );
  };
}
const ChevronLeft = makeIcon(<polyline points="15 18 9 12 15 6" />);
const ChevronRight = makeIcon(<polyline points="9 18 15 12 9 6" />);
const LogOut = makeIcon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>);
const Check = makeIcon(<polyline points="20 6 9 17 4 12" />);
const X = makeIcon(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>);
const AlertTriangle = makeIcon(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>);
const Loader2 = makeIcon(<path d="M21 12a9 9 0 1 1-6.219-8.56" />);
const WifiOff = makeIcon(<><circle cx="12" cy="12" r="9" /><line x1="6" y1="6" x2="18" y2="18" /></>);
const Package = makeIcon(<><rect x="4" y="7" width="16" height="13" rx="1.5" /><path d="M4 7l8-4 8 4" /><line x1="12" y1="7" x2="12" y2="20" /></>);
const RotateCcw = makeIcon(<><path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 4 3 9 8 9" /></>);
const Pencil = makeIcon(<><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>);
const Delete = makeIcon(<><path d="M21 4H8l-6 8 6 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="12" y1="9" x2="18" y2="15" /><line x1="18" y1="9" x2="12" y2="15" /></>);

// ── CONFIG ────────────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyjae8ljZwXp3pdcxqV5B-MhiQc3PCwEAvf2MMYV29E0qMprWulUZwa4dlCpMZJ9tkc/exec";
const FALLBACK_GYMS = ["ARC Gym", "Mahabodhi Gym", "Asia Fitness Center", "RPM Solo Baru", "RPM Manahan", "GMP Gentan"];
const FALLBACK_FLAVORS = ["Choco Forest", "Red Velvet", "Pink Banana", "Mixed Berry"];

async function callAppsScript(payload) {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.append(key, value);
  });
  const res = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayLabel() {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}
function gymShortName(g) {
  return String(g).replace(/\s*(GYM|Gym|FITNESS CENTER|Fitness Center)\b/g, "").trim() || g;
}
function greeting() {
  const h = new Date().getHours();
  if (h < 10) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}
// Solid, saturated accents — chosen for contrast in direct sunlight rather
// than for softness. No two neighbors repeat within a row of 6.
const CARD_ACCENTS = ["#3D5AFE", "#E8590C", "#0F9D58", "#8E24AA", "#D81B60", "#1565C0"];
function accentFor(index) {
  return CARD_ACCENTS[index % CARD_ACCENTS.length];
}
function gymInitials(g) {
  const words = gymShortName(g).trim().split(/\s+/);
  return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase() || "?";
}

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────────
// True "liquid glass" — layered translucency, soft specular highlight along
// the top edge, saturated blur, and rounded, pill-like geometry. Driver works
// indoors at the gym front desk, so legibility-under-glare isn't the
// constraint here; the constraint is looking premium and feeling like iOS.
const C = {
  indigo: "#5E5CE6",
  indigoDeep: "#4A48C4",
  green: "#34C759",
  greenBg: "rgba(52,199,89,0.14)",
  orange: "#FF9500",
  orangeBg: "rgba(255,149,0,0.14)",
  blue: "#0A84FF",
  blueBg: "rgba(10,132,255,0.14)",
  red: "#FF3B30",
  redBg: "rgba(255,59,48,0.12)",
  amber: "#B25E00",
  amberBg: "#FFF4E5",
  ink: "#1D1D1F",
  sub: "#6E6E73",
  mute: "#8E8E93",
  faint: "#AEAEB2",
  line: "#E5E5EA",
  paper: "#FFFFFF",
  bg: "#F1F0F8",
};

const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',system-ui,sans-serif";
const bgGradient = "linear-gradient(160deg,#F1F0F8 0%,#F6F6FA 45%,#F3F8F4 100%)";
const safeTop = "max(20px, env(safe-area-inset-top))";
const safeBottom = "max(22px, env(safe-area-inset-bottom))";
// Liquid-glass card: translucent, blurred, with a soft inner top-edge
// highlight to sell the "glass catching light" look, and a border tinted by
// the accent color rather than plain gray.
const glass = (border = "rgba(255,255,255,0.6)") => ({
  background: "rgba(255,255,255,0.68)",
  backdropFilter: "blur(26px) saturate(190%)",
  WebkitBackdropFilter: "blur(26px) saturate(190%)",
  border: `1px solid ${border}`,
  // Two-tone: a warm, soft shadow beneath (as if light falls from above) and
  // a cool inner rim-light along the top edge (as if the glass itself catches it).
  boxShadow: "0 1px 2px rgba(20,20,30,0.05), 0 14px 30px -10px rgba(94,92,230,0.16), 10px 14px 32px rgba(130,130,170,0.14), -6px -8px 20px rgba(255,255,255,0.65), inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(255,255,255,0.25)",
});
// Kept as an alias so the rest of the file reads the same as the glass era.
const cardStyle = glass;

// ── GLOBAL STYLES ──────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body { background: #F1F0F8; overflow-x: hidden; }
      @keyframes ffPop { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      @keyframes ffRise { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      @keyframes ffShake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(3px); } }
      @keyframes ffSpin { to { transform: rotate(360deg); } }
      @keyframes ffFade { 0% { opacity: 0; } 100% { opacity: 1; } }
      @keyframes ffScreenInFwd { 0% { opacity: 0; transform: translateY(18px) scale(0.985); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes ffScreenInBack { 0% { opacity: 0; transform: translateY(-10px) scale(1.01); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes ffCheckBounce { 0% { transform: scale(0); } 55% { transform: scale(1.18); } 75% { transform: scale(0.92); } 100% { transform: scale(1); } }
      @keyframes ffConfetti { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(0.4); opacity: 0; } }
      .ff-screen-fwd { animation: ffScreenInFwd 0.38s cubic-bezier(0.22,1,0.36,1) both; }
      .ff-screen-back { animation: ffScreenInBack 0.32s cubic-bezier(0.22,1,0.36,1) both; }
      .ff-confetti { animation: ffConfetti 0.7s cubic-bezier(0.22,1,0.36,1) both; }
      .ff-btn { transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease, border-color 0.15s ease; }
      .ff-btn:active { transform: scale(0.96); }
      .ff-card { transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
      .ff-card:active { transform: scale(0.97); }
      .ff-spin { animation: ffSpin 0.85s linear infinite; }
      .ff-shake { animation: ffShake 0.4s ease; }
      button, input { font-family: inherit; }
      button:focus-visible, input:focus-visible, [tabindex]:focus-visible {
        outline: 2.5px solid ${C.indigo};
        outline-offset: 2px;
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
        }
      }
    `}</style>
  );
}

// ── LOGO ──────────────────────────────────────────────────────────────────────
function LogoMark({ size = 72 }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {!err ? (
        <img src="/logo.png" alt="FitFocus" onError={() => setErr(true)} style={{ width: "180%", height: "180%", objectFit: "contain" }} />
      ) : (
        <span style={{ color: C.indigo, fontSize: size * 0.38, fontWeight: 700, letterSpacing: "-0.03em" }}>FF</span>
      )}
    </div>
  );
}

// ── REUSABLE ALERT MODAL ───────────────────────────────────────────────────────
function AlertModal({ icon: Icon, tone = "danger", title, body, cancelLabel = "Batal", confirmLabel, onCancel, onConfirm, busy }) {
  const toneColor = tone === "danger" ? C.red : C.indigo;
  const toneBg = tone === "danger" ? C.redBg : "rgba(94,92,230,0.14)";
  return (
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, background: "rgba(20,20,24,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24,
      fontFamily: FONT, animation: "ffFade 0.15s ease",
    }}>
      <div style={{ background: C.paper, borderRadius: 24, padding: "28px 22px", width: "100%", maxWidth: 340, textAlign: "center", animation: "ffPop 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        {Icon && (
          <div style={{
            width: 56, height: 56, borderRadius: "50%", background: toneBg,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
          }}>
            <Icon size={26} color={toneColor} strokeWidth={2.25} />
          </div>
        )}
        <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 8 }}>{title}</div>
        <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.5, margin: "0 0 22px" }}>{body}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ff-btn" onClick={onCancel} disabled={busy} style={{
            flex: 1, padding: "14px 14px", borderRadius: 14, border: `2px solid ${C.line}`,
            background: C.paper, color: C.sub, fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>{cancelLabel}</button>
          <button className="ff-btn" onClick={onConfirm} disabled={busy} style={{
            flex: 1, padding: "14px 14px", borderRadius: 14, border: "none",
            background: toneColor, color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1,
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onSubmit, loading, error }) {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (error) setPin("");
  }, [error]);

  const tap = (digit) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) onSubmit(next);
  };
  const backspace = () => setPin(pin.slice(0, -1));

  const keyBtnStyle = {
    aspectRatio: "1", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)",
    background: "rgba(255,255,255,0.82)", fontSize: 25, fontWeight: 600, color: C.ink,
    cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  return (
    <div style={{
      minHeight: "100vh", position: "relative", background: bgGradient,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: FONT, letterSpacing: "-0.01em", overflow: "hidden",
    }}>
      <div style={{ position: "fixed", top: "-15%", left: "-12%", width: 420, height: 420, borderRadius: "50%", background: C.indigo, opacity: 0.18, filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-10%", right: "-12%", width: 400, height: 400, borderRadius: "50%", background: C.green, opacity: 0.14, filter: "blur(110px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", ...cardStyle("rgba(255,255,255,0.6)"), borderRadius: 32, padding: "40px 28px", width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center", animation: "ffRise 0.35s ease" }}>
        <LogoMark size={80} />
        <h1 style={{ color: C.ink, fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", margin: "10px 0 2px" }}>FitFocus Driver</h1>
        <p style={{ color: C.mute, fontSize: 13, margin: "0 0 28px" }}>Masukkan PIN 4 digit untuk masuk</p>

        <div className={error ? "ff-shake" : ""} style={{ display: "flex", gap: 16, marginBottom: 26 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 20, height: 20, borderRadius: "50%",
              background: i < pin.length ? C.indigo : "transparent",
              border: `2.5px solid ${i < pin.length ? C.indigo : C.line}`,
              transition: "all 0.15s",
            }} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, width: "100%", marginBottom: 20, opacity: pin.length >= 4 || loading ? 0.45 : 1, transition: "opacity 0.15s" }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(n => (
            <button key={n} className="ff-btn" onClick={() => tap(n)} disabled={loading || pin.length >= 4} style={keyBtnStyle}>{n}</button>
          ))}
          <div />
          <button className="ff-btn" onClick={() => tap("0")} disabled={loading || pin.length >= 4} style={keyBtnStyle}>0</button>
          <button className="ff-btn" onClick={backspace} disabled={loading} aria-label="Hapus angka terakhir" style={{
            aspectRatio: "1", borderRadius: 18, border: "none", background: "transparent",
            color: C.mute, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}><Delete size={24} strokeWidth={2} /></button>
        </div>

        <button
          className="ff-btn"
          onClick={() => pin.length === 4 && !loading && onSubmit(pin)}
          disabled={pin.length !== 4 || loading}
          style={{
            width: "100%", padding: "16px 16px", borderRadius: 16, border: "none",
            cursor: pin.length === 4 && !loading ? "pointer" : "default",
            background: pin.length === 4 ? C.indigo : "#D1D1D6",
            color: "#fff", fontSize: 16, fontWeight: 700,
            boxShadow: pin.length === 4 ? "0 4px 16px rgba(94,92,230,0.35)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          {loading ? (<><Loader2 size={18} className="ff-spin" /> Memproses...</>) : "Masuk"}
        </button>

        {error && (
          <div style={{ marginTop: 16, background: C.redBg, color: C.red, padding: "12px 18px", borderRadius: 12, fontSize: 14, textAlign: "center", fontWeight: 700, width: "100%" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ANIMATED PROGRESS ──────────────────────────────────────────────────────────
// Counts a number up/down smoothly instead of snapping, so the header stat
// feels alive when a gym gets marked done.
function useCountUp(target, duration = 500) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

// SVG ring so the fill can genuinely animate (stroke-dashoffset transition)
// rather than snapping like a CSS conic-gradient would.
function ProgressRing({ percent, color, size = 58, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const animatedPercent = useCountUp(percent, 550);
  const offset = circumference - (animatedPercent / 100) * circumference;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E5EA" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.55s cubic-bezier(0.22,1,0.36,1), stroke 0.3s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 6, borderRadius: "50%", background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13.5, fontWeight: 800, color, fontVariantNumeric: "tabular-nums",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
      }}>{animatedPercent}%</div>
    </div>
  );
}


function TrayScreen({ gyms, completedToday, onSelectGym, driverName, onLogout, syncStatus, sessionTotals, navClass = "" }) {
  const doneCount = gyms.filter(g => completedToday.has(g)).length;
  const allDone = doneCount === gyms.length && gyms.length > 0;
  const remaining = gyms.length - doneCount;
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const animatedStock = useCountUp(sessionTotals.stock, 500);
  const animatedWaste = useCountUp(sessionTotals.waste, 500);

  const todoGyms = gyms.filter(g => !completedToday.has(g));
  const doneGyms = gyms.filter(g => completedToday.has(g));

  return (
    <div className={navClass} style={{
      minHeight: "100vh", position: "relative", background: bgGradient,
      fontFamily: FONT, letterSpacing: "-0.01em", paddingBottom: 40, overflowX: "hidden",
    }}>
      <div style={{ position: "fixed", top: "-12%", left: "-10%", width: 380, height: 380, borderRadius: "50%", background: C.indigo, opacity: 0.14, filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-8%", right: "-10%", width: 360, height: 360, borderRadius: "50%", background: C.green, opacity: 0.12, filter: "blur(100px)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ position: "relative", padding: `${safeTop} 18px 16px` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <LogoMark size={44} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.ink, fontSize: 17, fontWeight: 800, lineHeight: 1.15 }}>
                {greeting()}{driverName ? `, ${driverName.split(" ")[0]}` : ""}
              </div>
              <div style={{ color: C.mute, fontSize: 12.5, marginTop: 1 }}>{todayLabel()}</div>
            </div>
          </div>
          <button className="ff-btn" onClick={() => setConfirmingLogout(true)} aria-label="Keluar" style={{
            width: 40, height: 40, borderRadius: 13, border: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(255,255,255,0.65)", color: C.sub, cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><LogOut size={17} strokeWidth={2} /></button>
        </div>

        {syncStatus && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: C.amberBg, color: C.amber,
            padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
          }}>
            <WifiOff size={13} strokeWidth={2.5} /> {syncStatus}
          </div>
        )}
      </div>

      {/* Progress banner */}
      <div style={{ padding: "0 18px 14px" }}>
        <div style={{
          ...cardStyle(allDone ? C.green + "44" : C.indigo + "33"),
          borderRadius: 20, padding: "18px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.mute, fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>PROGRES HARI INI</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: allDone ? C.green : C.ink, display: "flex", alignItems: "center", gap: 6 }}>
              {allDone && <Check size={18} strokeWidth={3} color={C.green} />}
              {allDone ? "Semua gym selesai" : `Tersisa ${remaining} gym`}
            </div>
            {!allDone && (
              <div style={{ fontSize: 12.5, color: C.mute, marginTop: 2 }}>{doneCount} dari {gyms.length} gym sudah dikirim</div>
            )}
          </div>
          <ProgressRing
            percent={gyms.length ? Math.round((doneCount / gyms.length) * 100) : 0}
            color={allDone ? C.green : C.indigo}
          />
        </div>
      </div>

      {/* Session totals */}
      {sessionTotals.gymsCounted > 0 && (
        <div style={{ padding: "0 18px 22px" }}>
          <div style={{ fontSize: 12, color: C.mute, fontWeight: 700, letterSpacing: 0.4, marginBottom: 8, paddingLeft: 4 }}>
            TERKIRIM SESI INI
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ ...cardStyle(C.blue + "26"), borderRadius: 18, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Package size={14} color={C.blue} strokeWidth={2.25} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.blue, letterSpacing: 0.3 }}>STOK</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{animatedStock}</div>
            </div>
            <div style={{ ...cardStyle(C.orange + "26"), borderRadius: 18, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <RotateCcw size={14} color={C.orange} strokeWidth={2.25} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.orange, letterSpacing: 0.3 }}>SISA</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{animatedWaste}</div>
            </div>
          </div>
        </div>
      )}

      {/* Belum diisi */}
      {todoGyms.length > 0 && (
        <div style={{ padding: "0 18px 24px" }}>
          <div style={{ fontSize: 12.5, color: C.mute, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12, paddingLeft: 4 }}>
            BELUM DIISI · {todoGyms.length}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
            {todoGyms.map((gym) => {
              const idx = gyms.indexOf(gym);
              const accent = accentFor(idx);
              return (
                <button
                  key={gym}
                  className="ff-card"
                  onClick={() => onSelectGym(gym)}
                  style={{
                    position: "relative", ...cardStyle(),
                    borderTop: `4px solid ${accent}`,
                    borderRadius: 20, padding: "20px 12px 18px", minHeight: 124, minWidth: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", textAlign: "center",
                    animation: "ffPop 0.3s ease backwards", animationDelay: `${idx * 0.04}s`,
                  }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, background: accent,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: 0.2,
                  }}>{gymInitials(gym)}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, lineHeight: 1.25 }}>
                    {gymShortName(gym)}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.mute, marginTop: 4, display: "flex", alignItems: "center", gap: 2, fontWeight: 600 }}>
                    Ketuk untuk isi <ChevronRight size={12} strokeWidth={2.5} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sudah diisi */}
      {doneGyms.length > 0 && (
        <div style={{ padding: "0 18px" }}>
          <div style={{ fontSize: 12.5, color: C.mute, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12, paddingLeft: 4 }}>
            SUDAH DIISI · {doneGyms.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {doneGyms.map((gym) => (
              <button
                key={gym}
                className="ff-card"
                onClick={() => onSelectGym(gym)}
                style={{
                  ...cardStyle(C.green + "33"), background: C.greenBg,
                  borderRadius: 16, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12,
                  cursor: "pointer", textAlign: "left", minWidth: 0,
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", background: C.green, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}><Check size={15} strokeWidth={3} /></div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gymShortName(gym)}</span>
                <span style={{
                  display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.green, fontWeight: 700,
                  background: "#fff", padding: "6px 11px", borderRadius: 999, flexShrink: 0,
                }}><Pencil size={11} strokeWidth={2.5} /> Ubah</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {confirmingLogout && (
        <AlertModal
          icon={LogOut}
          tone="danger"
          title="Keluar dari akun?"
          body="Data yang sudah kamu kirim hari ini tetap tersimpan. Kamu perlu memasukkan PIN lagi saat masuk kembali."
          cancelLabel="Batal"
          confirmLabel="Keluar"
          onCancel={() => setConfirmingLogout(false)}
          onConfirm={onLogout}
        />
      )}
    </div>
  );
}

// ── NUMBER FIELD (stok / sisa entry — no +/- steppers) ────────────────────────
// Full-width, big-target field. Driver taps once to bring up the numeric
// keypad and types the count directly; a clear "×" appears once a value is
// entered so a mistake is one tap to fix instead of many decrements.
function NumberField({ label, value, onChange, color, colorBg, icon: Icon }) {
  const inputRef = useRef(null);
  const filled = value !== "";
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 7, background: colorBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={12} color={color} strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 800, color, letterSpacing: 0.4 }}>{label}</span>
      </div>
      <div style={{ position: "relative", width: "100%" }}>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
          onFocus={(e) => e.target.select()}
          placeholder="0"
          aria-label={label}
          style={{
            width: "100%", boxSizing: "border-box", textAlign: "center",
            fontSize: 34, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums",
            padding: "16px 44px", borderRadius: 16,
            border: `2px solid ${filled ? color : "rgba(0,0,0,0.08)"}`,
            background: filled ? colorBg : "rgba(255,255,255,0.7)",
            outline: "none",
          }}
        />
        {filled && (
          <button
            className="ff-btn"
            onClick={() => { onChange(""); inputRef.current?.focus(); }}
            aria-label={`Kosongkan ${label}`}
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: "rgba(20,20,22,0.08)", color: C.sub, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><X size={15} strokeWidth={2.5} /></button>
        )}
      </div>
    </div>
  );
}

// ── GYM FORM ──────────────────────────────────────────────────────────────────
function GymFormScreen({ gym, flavors, initialData, onBack, onReviewSubmit, navClass = "", gymAccent = C.indigo }) {
  const [values, setValues] = useState(() => {
    const init = {};
    flavors.forEach(f => {
      init[f] = initialData?.[f] || { stock: "", waste: "" };
    });
    return init;
  });
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const setField = (flavor, field, val) => {
    setValues(prev => ({ ...prev, [flavor]: { ...prev[flavor], [field]: val } }));
  };

  const filledCount = flavors.filter(f => values[f].stock !== "" || values[f].waste !== "").length;
  const canReview = filledCount > 0;

  const handleBack = () => {
    if (filledCount > 0) setShowLeaveConfirm(true);
    else onBack();
  };

  return (
    <div className={navClass} style={{
      minHeight: "100vh", position: "relative", background: bgGradient,
      fontFamily: FONT, letterSpacing: "-0.01em", paddingBottom: 140, overflowX: "hidden",
    }}>
      <div style={{ position: "fixed", top: "-12%", right: "-10%", width: 360, height: 360, borderRadius: "50%", background: C.indigo, opacity: 0.13, filter: "blur(100px)", pointerEvents: "none" }} />

      {/* Sticky hero header — the gym stays big, colored, and pinned in
          view the whole time you're filling flavors, so a driver scrolling
          through a long list never loses track of which gym they're on. */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(241,240,248,0.82)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: `1px solid rgba(255,255,255,0.5)`,
        padding: `${safeTop} 18px 16px`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="ff-btn" onClick={handleBack} aria-label="Kembali"
            style={{
              width: 40, height: 40, borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)",
              background: "rgba(255,255,255,0.75)", color: C.ink, cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><ChevronLeft size={20} strokeWidth={2.25} /></button>

          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: gymAccent, color: "#fff", fontSize: 17, fontWeight: 800, letterSpacing: 0.2,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 6px 16px ${gymAccent}55`,
          }}>{gymInitials(gym)}</div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: gymAccent, fontWeight: 800, letterSpacing: 0.6 }}>SEDANG ISI DATA</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gymShortName(gym)}</div>
          </div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      {/* Flavor cards — Stok and Sisa stacked full-width so nothing can
          ever overflow the viewport, and each field gets a large tap target. */}
      <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {flavors.map((flavor) => {
          const filled = values[flavor].stock !== "" || values[flavor].waste !== "";
          return (
            <div key={flavor} style={{
              ...cardStyle(filled ? C.indigo + "44" : "rgba(0,0,0,0.06)"),
              borderRadius: 20, padding: 18,
            }}>
              <div style={{ fontSize: 16.5, fontWeight: 800, color: C.ink, marginBottom: 14 }}>{flavor}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <NumberField label="STOK" icon={Package} color={C.blue} colorBg={C.blueBg} value={values[flavor].stock} onChange={(v) => setField(flavor, "stock", v)} />
                <NumberField label="SISA" icon={RotateCcw} color={C.orange} colorBg={C.orangeBg} value={values[flavor].waste} onChange={(v) => setField(flavor, "waste", v)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom CTA */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, padding: `16px 18px ${safeBottom}`,
        background: "linear-gradient(0deg, rgba(243,243,247,0.98) 60%, rgba(243,243,247,0))",
        backdropFilter: "blur(6px)",
      }}>
        <div style={{ fontSize: 12.5, color: C.mute, textAlign: "center", marginBottom: 10, fontWeight: 600 }}>
          {filledCount} dari {flavors.length} rasa terisi
        </div>
        <button
          className="ff-btn"
          onClick={() => canReview && onReviewSubmit(gym, values)}
          disabled={!canReview}
          style={{
            width: "100%", padding: "18px 16px", borderRadius: 18, border: "none",
            cursor: canReview ? "pointer" : "default",
            background: canReview ? C.indigo : "#D1D1D6",
            color: "#fff", fontSize: 17, fontWeight: 700,
            boxShadow: canReview ? "0 6px 20px rgba(94,92,230,0.35)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          Periksa & Kirim <ChevronRight size={19} strokeWidth={2.5} />
        </button>
      </div>

      {showLeaveConfirm && (
        <AlertModal
          icon={AlertTriangle}
          tone="danger"
          title="Keluar tanpa mengirim?"
          body={`Data yang sudah kamu isi untuk ${gymShortName(gym)} belum dikirim dan akan hilang jika kamu kembali sekarang.`}
          cancelLabel="Tetap di Sini"
          confirmLabel="Ya, Keluar"
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={() => { setShowLeaveConfirm(false); onBack(); }}
        />
      )}
    </div>
  );
}

// ── CONFIRM POPUP ─────────────────────────────────────────────────────────────
function ConfirmModal({ gym, flavors, values, onCancel, onConfirm, submitting }) {
  const rows = flavors.map(f => {
    const touched = values[f].stock !== "" || values[f].waste !== "";
    return { flavor: f, stock: values[f].stock || "0", waste: values[f].waste || "0", touched };
  });
  const untouchedCount = rows.filter(r => !r.touched).length;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,20,24,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, fontFamily: FONT,
    }}>
      <div style={{
        width: "100%", maxWidth: 480, background: C.paper, borderRadius: "28px 28px 0 0",
        padding: `26px 20px calc(${safeBottom} + 8px)`, boxShadow: "0 -18px 50px rgba(20,20,30,0.28), 0 -1px 0 rgba(255,255,255,0.9) inset",
        maxHeight: "84vh", overflowY: "auto", animation: "ffRise 0.28s cubic-bezier(0.34,1.2,0.4,1)", boxSizing: "border-box",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.line, margin: "0 auto 20px" }} />

        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: C.mute, fontWeight: 700, letterSpacing: 0.5 }}>KONFIRMASI</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: C.ink, marginTop: 2 }}>{gymShortName(gym)}</div>
        </div>
        <p style={{ textAlign: "center", color: C.sub, fontSize: 13.5, margin: "6px 0 16px" }}>
          Cek lagi sebelum kirim. Pastikan semua angka sudah benar.
        </p>

        {untouchedCount > 0 && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 9, background: C.amberBg, color: C.amber,
            borderRadius: 14, padding: "11px 14px", marginBottom: 16, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
          }}>
            <AlertTriangle size={16} strokeWidth={2.25} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {untouchedCount} rasa belum kamu isi ({rows.filter(r => !r.touched).map(r => r.flavor).join(", ")}) —
              akan dikirim sebagai <b>0</b>. Pastikan itu benar sebelum lanjut.
            </span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {rows.map(r => (
            <div key={r.flavor} style={{
              background: r.touched ? C.bg : "repeating-linear-gradient(135deg, #F4F4F7, #F4F4F7 8px, #EDEDF2 8px, #EDEDF2 16px)",
              border: r.touched ? "1.5px solid transparent" : `1.5px dashed ${C.faint}`,
              borderRadius: 16, padding: "14px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: r.touched ? C.ink : C.mute, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.flavor}</span>
                {!r.touched && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: C.amber, background: "#fff", padding: "3px 7px", borderRadius: 999, flexShrink: 0, letterSpacing: 0.3 }}>0</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, color: r.touched ? C.blue : C.faint, fontWeight: 800, letterSpacing: 0.3 }}>STOK</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: r.touched ? C.ink : C.faint, fontVariantNumeric: "tabular-nums" }}>{r.stock}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, color: r.touched ? C.orange : C.faint, fontWeight: 800, letterSpacing: 0.3 }}>SISA</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: r.touched ? C.ink : C.faint, fontVariantNumeric: "tabular-nums" }}>{r.waste}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {rows.length > 1 && (
          <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 0 20px", borderTop: `1.5px solid ${C.line}` }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10.5, color: C.blue, fontWeight: 800, letterSpacing: 0.3 }}>TOTAL STOK</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                {rows.reduce((sum, r) => sum + (parseInt(r.stock, 10) || 0), 0)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10.5, color: C.orange, fontWeight: 800, letterSpacing: 0.3 }}>TOTAL SISA</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                {rows.reduce((sum, r) => sum + (parseInt(r.waste, 10) || 0), 0)}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="ff-btn" onClick={onCancel} disabled={submitting} style={{
            flex: 1, padding: "16px 16px", borderRadius: 16, border: `2px solid ${C.line}`,
            background: C.paper, color: C.sub, fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>
            Edit Lagi
          </button>
          <button className="ff-btn" onClick={onConfirm} disabled={submitting} style={{
            flex: 2, padding: "16px 16px", borderRadius: 16, border: "none",
            background: C.green, color: "#fff", fontSize: 15, fontWeight: 700, cursor: submitting ? "default" : "pointer",
            boxShadow: "0 6px 20px rgba(52,199,89,0.35)", opacity: submitting ? 0.75 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {submitting ? (<><Loader2 size={16} className="ff-spin" /> Mengirim...</>) : (<><Check size={16} strokeWidth={2.5} /> Ya, Kirim Data</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SUCCESS OVERLAY ────────────────────────────────────────────────────────────
function SuccessOverlay({ gym }) {
  // Small fixed set of confetti dots, each with a random-ish outward
  // direction baked in via CSS custom properties, staggered slightly.
  const confetti = [
    { color: C.indigo, dx: -70, dy: -46, delay: 0.05 },
    { color: C.green, dx: 66, dy: -52, delay: 0.09 },
    { color: C.orange, dx: -54, dy: 50, delay: 0.02 },
    { color: C.blue, dx: 60, dy: 48, delay: 0.13 },
    { color: C.indigo, dx: 0, dy: -74, delay: 0.16 },
    { color: C.green, dx: 0, dy: 72, delay: 0.07 },
  ];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,20,24,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, fontFamily: FONT, padding: 20,
    }}>
      <div style={{
        position: "relative", background: C.paper, borderRadius: 26, padding: "36px 36px", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "ffPop 0.32s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <div style={{ position: "absolute", left: "50%", top: 46, width: 0, height: 0, pointerEvents: "none" }}>
          {confetti.map((c, i) => (
            <span
              key={i}
              className="ff-confetti"
              style={{
                position: "absolute", width: 7, height: 7, borderRadius: i % 2 ? "50%" : 2,
                background: c.color, left: 0, top: 0,
                "--dx": `${c.dx}px`, "--dy": `${c.dy}px`,
                animationDelay: `${c.delay}s`,
              }}
            />
          ))}
        </div>
        <div style={{
          width: 66, height: 66, borderRadius: "50%", background: C.green,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          animation: "ffCheckBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both",
        }}><Check size={32} strokeWidth={3} color="#fff" /></div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>{gymShortName(gym)} berhasil dikirim</div>
        <div style={{ fontSize: 13.5, color: C.mute, marginTop: 4 }}>Lanjut ke gym berikutnya</div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [authToken, setAuthToken] = useState(null);
  const [driverName, setDriverName] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [gyms, setGyms] = useState(FALLBACK_GYMS);
  const [flavors, setFlavors] = useState(FALLBACK_FLAVORS);
  const [syncStatus, setSyncStatus] = useState("");

  const [screen, setScreen] = useState("tray");
  const [navDirection, setNavDirection] = useState("fwd"); // "fwd" entering a gym, "back" returning to tray
  const [activeGym, setActiveGym] = useState(null);
  const [pendingValues, setPendingValues] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [completedToday, setCompletedToday] = useState(new Set());
  const [savedValues, setSavedValues] = useState({});

  const loadGymList = useCallback(async (token) => {
    try {
      const data = await callAppsScript({ action: "getGymList", token });
      if (data.ok && Array.isArray(data.gyms) && data.gyms.length) {
        setGyms(data.gyms);
        setSyncStatus("");
      } else {
        setSyncStatus("Memakai daftar gym cadangan, sheet belum tersambung");
      }
    } catch {
      setSyncStatus("Memakai daftar gym cadangan, sheet belum tersambung");
    }
  }, []);

  const loadFlavorList = useCallback(async (token) => {
    try {
      const data = await callAppsScript({ action: "getFlavorList", token });
      if (data.ok && Array.isArray(data.flavors) && data.flavors.length) {
        setFlavors(data.flavors);
      }
    } catch {
      // silent fallback
    }
  }, []);

  const loadCompletedToday = useCallback(async (token) => {
    try {
      const data = await callAppsScript({ action: "getTodayStatus", token, date: todayKey() });
      if (data.ok && Array.isArray(data.completedGyms)) {
        setCompletedToday(new Set(data.completedGyms));
      }
    } catch {
      // silent
    }
  }, []);

  const handleLogin = useCallback(async (pin) => {
    setLoginLoading(true);
    setLoginError("");
    try {
      const data = await callAppsScript({ action: "driverLogin", pin });
      if (data.ok) {
        setAuthToken(data.token);
        setDriverName(data.driverName || "");
        loadGymList(data.token);
        loadFlavorList(data.token);
        loadCompletedToday(data.token);
      } else {
        setLoginError(data.error || "PIN salah. Coba lagi.");
      }
    } catch {
      setLoginError("Tidak dapat terhubung. Periksa koneksi internet, lalu coba lagi.");
    } finally {
      setLoginLoading(false);
    }
  }, [loadGymList, loadFlavorList, loadCompletedToday]);

  const handleLogout = () => {
    setAuthToken(null);
    setDriverName("");
    setCompletedToday(new Set());
    setSavedValues({});
    setScreen("tray");
  };

  const handleSelectGym = (gym) => {
    setActiveGym(gym);
    setNavDirection("fwd");
    setScreen("form");
  };

  const handleReviewSubmit = (gym, values) => {
    setPendingValues(values);
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    setSubmitting(true);
    try {
      const flavorPayload = {};
      flavors.forEach(f => {
        flavorPayload[f] = { stock: Number(pendingValues[f].stock) || 0, waste: Number(pendingValues[f].waste) || 0 };
      });
      await callAppsScript({
        action: "submitGymData",
        token: authToken,
        gym: activeGym,
        date: todayKey(),
        data: JSON.stringify(flavorPayload),
      });
      setSavedValues(prev => ({ ...prev, [activeGym]: pendingValues }));
      setCompletedToday(prev => new Set([...prev, activeGym]));
      setShowConfirm(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setNavDirection("back");
        setScreen("tray");
        setActiveGym(null);
        setPendingValues(null);
      }, 1300);
    } catch (err) {
      alert("Gagal mengirim data. Coba lagi. " + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const sessionTotals = useMemo(() => {
    let stock = 0, waste = 0, gymsCounted = 0;
    Object.values(savedValues).forEach((vals) => {
      gymsCounted += 1;
      Object.values(vals).forEach((v) => {
        stock += Number(v.stock) || 0;
        waste += Number(v.waste) || 0;
      });
    });
    return { stock, waste, gymsCounted };
  }, [savedValues]);

  if (!authToken) {
    return (
      <>
        <GlobalStyles />
        <LoginScreen onSubmit={handleLogin} loading={loginLoading} error={loginError} />
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      {screen === "tray" && (
        <TrayScreen
          gyms={gyms}
          completedToday={completedToday}
          onSelectGym={handleSelectGym}
          driverName={driverName}
          onLogout={handleLogout}
          syncStatus={syncStatus}
          sessionTotals={sessionTotals}
          navClass={navDirection === "back" ? "ff-screen-back" : ""}
        />
      )}
      {screen === "form" && activeGym && (
        <GymFormScreen
          gym={activeGym}
          flavors={flavors}
          initialData={savedValues[activeGym]}
          onBack={() => { setNavDirection("back"); setScreen("tray"); setActiveGym(null); }}
          onReviewSubmit={handleReviewSubmit}
          navClass="ff-screen-fwd"
          gymAccent={accentFor(gyms.indexOf(activeGym))}
        />
      )}
      {showConfirm && pendingValues && (
        <ConfirmModal
          gym={activeGym}
          flavors={flavors}
          values={pendingValues}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmSend}
          submitting={submitting}
        />
      )}
      {showSuccess && <SuccessOverlay gym={activeGym} />}
    </>
  );
}
