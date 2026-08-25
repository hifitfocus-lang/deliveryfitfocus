import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, LogOut, Plus, Minus, Check, X,
  AlertTriangle, Loader2, WifiOff, Package, RotateCcw, Pencil, Delete,
} from "lucide-react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Same Apps Script backend as the main dashboard — GET-based due to the
// Apps Script Web App redirect dropping POST bodies (see dashboard notes).
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyjae8ljZwXp3pdcxqV5B-MhiQc3PCwEAvf2MMYV29E0qMprWulUZwa4dlCpMZJ9tkc/exec";

// Fallback lists used only if the sheet fetch hasn't resolved yet — the real
// lists always come live from Apps Script once connected, so a flavor swap
// in the sheet or a gym change shows up automatically without touching this file.
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
// Rotating accent color per gym card — purely visual variety so the
// grid doesn't read as one flat wall of identical white cards.
const CARD_ACCENTS = ["#5E5CE6", "#0A84FF", "#FF9500", "#AF52DE", "#34C759", "#FF375F"];
function accentFor(index) {
  return CARD_ACCENTS[index % CARD_ACCENTS.length];
}
function gymInitials(g) {
  const words = gymShortName(g).trim().split(/\s+/);
  return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase() || "?";
}

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────────
const C = {
  indigo: "#5E5CE6",
  indigoDeep: "#4A48C4",
  green: "#34C759",
  orange: "#FF9500",
  blue: "#0A84FF",
  red: "#FF3B30",
  amber: "#B25E00",
  amberBg: "#FFF4E5",
  ink: "#1D1D1F",
  sub: "#6E6E73",
  mute: "#8E8E93",
  faint: "#AEAEB2",
  line: "#E5E5EA",
  divider: "#D1D1D6",
};

const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',system-ui,sans-serif";
const bgGradient = "linear-gradient(160deg,#F1F0F8 0%,#F6F6FA 45%,#F3F8F4 100%)";
const glass = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  boxShadow: "0 1px 2px rgba(20,20,30,0.04), 8px 10px 26px rgba(130,130,170,0.14), -6px -6px 18px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.55)",
};
const safeTop = "max(20px, env(safe-area-inset-top))";
const safeBottom = "max(22px, env(safe-area-inset-bottom))";

// ── GLOBAL STYLES ──────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      @keyframes ffPop { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      @keyframes ffRise { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      @keyframes ffShake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(3px); } }
      @keyframes ffSpin { to { transform: rotate(360deg); } }
      @keyframes ffFade { 0% { opacity: 0; } 100% { opacity: 1; } }
      .ff-btn { transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease, border-color 0.15s ease; }
      .ff-btn:active { transform: scale(0.95); }
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
  return (
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, background: "rgba(20,20,24,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 24,
      fontFamily: FONT, animation: "ffFade 0.15s ease",
    }}>
      <div style={{ background: "#fff", borderRadius: 26, padding: "26px 24px", width: "100%", maxWidth: 340, textAlign: "center", animation: "ffPop 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
        {Icon && (
          <div style={{
            width: 52, height: 52, borderRadius: "50%", background: toneColor + "17",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
          }}>
            <Icon size={24} color={toneColor} strokeWidth={2.25} />
          </div>
        )}
        <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, marginBottom: 8 }}>{title}</div>
        <p style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.5, margin: "0 0 22px" }}>{body}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ff-btn" onClick={onCancel} disabled={busy} style={{
            flex: 1, padding: "13px 14px", borderRadius: 14, border: `1.5px solid ${C.line}`,
            background: "#fff", color: C.sub, fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>{cancelLabel}</button>
          <button className="ff-btn" onClick={onConfirm} disabled={busy} style={{
            flex: 1, padding: "13px 14px", borderRadius: 14, border: "none",
            background: toneColor, color: "#fff", fontSize: 14, fontWeight: 700,
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

  // Clear the dots the moment a wrong-PIN error comes back, so the driver can
  // immediately retype instead of having to manually backspace 4 times.
  useEffect(() => {
    if (error) setPin("");
  }, [error]);

  const tap = (digit) => {
    if (pin.length >= 4) return; // hard-capped at 4 — a fast/extra tap is simply ignored
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) onSubmit(next); // auto-submit the moment the 4th digit lands
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

      <div style={{ position: "relative", ...glass, border: "1px solid rgba(255,255,255,0.6)", borderRadius: 32, padding: "40px 28px", width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center", animation: "ffRise 0.35s ease" }}>
        <LogoMark size={80} />
        <h1 style={{ color: C.ink, fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", margin: "10px 0 2px" }}>FitFocus Driver</h1>
        <p style={{ color: C.mute, fontSize: 13, margin: "0 0 28px" }}>Masukkan PIN 4 digit untuk masuk</p>

        {/* PIN dots */}
        <div className={error ? "ff-shake" : ""} style={{ display: "flex", gap: 14, marginBottom: 28 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: "50%",
              background: i < pin.length ? C.indigo : "transparent",
              border: `2px solid ${i < pin.length ? C.indigo : C.line}`,
              transition: "all 0.15s",
            }} />
          ))}
        </div>

        {/* Numpad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, width: "100%", marginBottom: 20, opacity: pin.length >= 4 || loading ? 0.45 : 1, transition: "opacity 0.15s" }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(n => (
            <button key={n} className="ff-btn" onClick={() => tap(n)} disabled={loading || pin.length >= 4} style={keyBtnStyle}>{n}</button>
          ))}
          <div />
          <button className="ff-btn" onClick={() => tap("0")} disabled={loading || pin.length >= 4} style={keyBtnStyle}>0</button>
          <button className="ff-btn" onClick={backspace} disabled={loading} aria-label="Hapus angka terakhir" style={{
            aspectRatio: "1", borderRadius: 20, border: "none", background: "transparent",
            color: C.mute, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}><Delete size={22} strokeWidth={2} /></button>
        </div>

        <button
          className="ff-btn"
          onClick={() => pin.length === 4 && !loading && onSubmit(pin)}
          disabled={pin.length !== 4 || loading}
          style={{
            width: "100%", padding: "15px 16px", borderRadius: 16, border: "none",
            cursor: pin.length === 4 && !loading ? "pointer" : "default",
            background: pin.length === 4 ? C.indigo : "#D1D1D6",
            color: "#fff", fontSize: 16, fontWeight: 700,
            boxShadow: pin.length === 4 ? "0 4px 16px rgba(94,92,230,0.35)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          {loading ? (<><Loader2 size={18} className="ff-spin" /> Memproses...</>) : "Masuk"}
        </button>

        {error && (
          <div style={{ marginTop: 16, background: "#FFF1F0", color: "#D70015", padding: "11px 18px", borderRadius: 12, fontSize: 13, textAlign: "center", fontWeight: 600 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TRAY (GYM GRID) ───────────────────────────────────────────────────────────
function TrayScreen({ gyms, completedToday, onSelectGym, driverName, onLogout, syncStatus, sessionTotals }) {
  const doneCount = gyms.filter(g => completedToday.has(g)).length;
  const allDone = doneCount === gyms.length && gyms.length > 0;
  const remaining = gyms.length - doneCount;
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const todoGyms = gyms.filter(g => !completedToday.has(g));
  const doneGyms = gyms.filter(g => completedToday.has(g));

  return (
    <div style={{
      minHeight: "100vh", position: "relative", background: bgGradient,
      fontFamily: FONT, letterSpacing: "-0.01em", paddingBottom: 40,
    }}>
      <div style={{ position: "fixed", top: "-12%", left: "-10%", width: 380, height: 380, borderRadius: "50%", background: C.indigo, opacity: 0.14, filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-8%", right: "-10%", width: 360, height: 360, borderRadius: "50%", background: C.green, opacity: 0.12, filter: "blur(100px)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ position: "relative", padding: `${safeTop} 20px 18px` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoMark size={44} />
            <div>
              <div style={{ color: C.ink, fontSize: 16, fontWeight: 800, lineHeight: 1.15 }}>
                {greeting()}{driverName ? `, ${driverName.split(" ")[0]}` : ""}
              </div>
              <div style={{ color: C.mute, fontSize: 12, marginTop: 1 }}>{todayLabel()}</div>
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
            padding: "6px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
          }}>
            <WifiOff size={12} strokeWidth={2.5} /> {syncStatus}
          </div>
        )}
      </div>

      {/* Progress banner */}
      <div style={{ padding: "0 20px 14px" }}>
        <div style={{
          ...glass, border: `1px solid ${allDone ? C.green + "44" : C.indigo + "33"}`,
          borderRadius: 22, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11.5, color: C.mute, fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>PROGRES HARI INI</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: allDone ? C.green : C.ink, display: "flex", alignItems: "center", gap: 6 }}>
              {allDone && <Check size={18} strokeWidth={3} color={C.green} />}
              {allDone ? "Semua gym sudah selesai" : `Tersisa ${remaining} gym`}
            </div>
            {!allDone && (
              <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{doneCount} dari {gyms.length} gym sudah dikirim</div>
            )}
          </div>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: `conic-gradient(${allDone ? C.green : C.indigo} ${gyms.length ? (doneCount / gyms.length) * 360 : 0}deg, #E5E5EA 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: allDone ? C.green : C.indigo, fontVariantNumeric: "tabular-nums" }}>
              {gyms.length ? Math.round((doneCount / gyms.length) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Session totals — only what's tracked on this device this session */}
      {sessionTotals.gymsCounted > 0 && (
        <div style={{ padding: "0 20px 22px" }}>
          <div style={{ fontSize: 11, color: C.mute, fontWeight: 700, letterSpacing: 0.4, marginBottom: 8, paddingLeft: 4 }}>
            TERKIRIM SESI INI
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ ...glass, border: `1px solid ${C.blue}26`, borderRadius: 18, padding: "13px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Package size={13} color={C.blue} strokeWidth={2.25} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 0.3 }}>STOK</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{sessionTotals.stock}</div>
            </div>
            <div style={{ ...glass, border: `1px solid ${C.orange}26`, borderRadius: 18, padding: "13px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <RotateCcw size={13} color={C.orange} strokeWidth={2.25} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.orange, letterSpacing: 0.3 }}>SISA</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{sessionTotals.waste}</div>
            </div>
          </div>
        </div>
      )}

      {/* Belum diisi — primary focus */}
      {todoGyms.length > 0 && (
        <div style={{ padding: "0 20px 24px" }}>
          <div style={{ fontSize: 12, color: C.mute, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12, paddingLeft: 4 }}>
            BELUM DIISI · {todoGyms.length}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            {todoGyms.map((gym) => {
              const idx = gyms.indexOf(gym);
              const accent = accentFor(idx);
              return (
                <button
                  key={gym}
                  className="ff-card"
                  onClick={() => onSelectGym(gym)}
                  style={{
                    position: "relative", ...glass,
                    border: "1.5px solid rgba(0,0,0,0.06)",
                    borderTop: `3px solid ${accent}`,
                    borderRadius: 22, padding: "20px 14px 18px", minHeight: 120,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", textAlign: "center",
                    animation: "ffPop 0.3s ease backwards", animationDelay: `${idx * 0.04}s`,
                  }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, background: accent + "16",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: accent, marginBottom: 8, letterSpacing: 0.2,
                  }}>{gymInitials(gym)}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.25 }}>
                    {gymShortName(gym)}
                  </div>
                  <div style={{ fontSize: 11, color: C.faint, marginTop: 4, display: "flex", alignItems: "center", gap: 2 }}>
                    Ketuk untuk isi data <ChevronRight size={12} strokeWidth={2.5} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sudah diisi — secondary, compact */}
      {doneGyms.length > 0 && (
        <div style={{ padding: "0 20px" }}>
          <div style={{ fontSize: 12, color: C.mute, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12, paddingLeft: 4 }}>
            SUDAH DIISI · {doneGyms.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {doneGyms.map((gym) => (
              <button
                key={gym}
                className="ff-card"
                onClick={() => onSelectGym(gym)}
                style={{
                  ...glass, border: `1px solid ${C.green}33`, background: "rgba(52,199,89,0.06)",
                  borderRadius: 16, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12,
                  cursor: "pointer", textAlign: "left",
                }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", background: C.green, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}><Check size={14} strokeWidth={3} /></div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, flex: 1 }}>{gymShortName(gym)}</span>
                <span style={{
                  display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: C.green, fontWeight: 700,
                  background: "rgba(52,199,89,0.12)", padding: "5px 10px", borderRadius: 999,
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

// ── STEPPER FIELD (stok / sisa entry) ─────────────────────────────────────────
function StepperField({ label, value, onChange, color, icon: Icon }) {
  const num = parseInt(value, 10) || 0;
  const dec = () => onChange(String(Math.max(0, num - 1)));
  const inc = () => onChange(String(num + 1));

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Icon size={13} color={color} strokeWidth={2.25} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color, letterSpacing: 0.4 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          className="ff-btn" onClick={dec} aria-label={`Kurangi ${label}`}
          disabled={num === 0}
          style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0, cursor: num === 0 ? "default" : "pointer",
            border: `1.5px solid ${value ? color + "33" : C.line}`, background: value ? color + "12" : "#F4F4F7",
            color, display: "flex", alignItems: "center", justifyContent: "center", opacity: num === 0 ? 0.5 : 1,
          }}><Minus size={15} strokeWidth={2.5} /></button>

        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
          onFocus={(e) => e.target.select()}
          placeholder="0"
          style={{
            flex: 1, minWidth: 0, boxSizing: "border-box", textAlign: "center",
            fontSize: 27, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums",
            padding: "10px 4px", borderRadius: 14,
            border: `2px solid ${value ? color + "55" : C.line}`,
            background: value ? color + "0d" : "rgba(255,255,255,0.7)",
            outline: "none",
          }}
        />
        <button
          className="ff-btn" onClick={inc} aria-label={`Tambah ${label}`}
          style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0, cursor: "pointer",
            border: "none", background: color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><Plus size={15} strokeWidth={2.5} /></button>
      </div>
    </div>
  );
}

// ── GYM FORM ──────────────────────────────────────────────────────────────────
function GymFormScreen({ gym, flavors, initialData, onBack, onReviewSubmit }) {
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
    <div style={{
      minHeight: "100vh", position: "relative", background: bgGradient,
      fontFamily: FONT, letterSpacing: "-0.01em", paddingBottom: 130,
    }}>
      <div style={{ position: "fixed", top: "-12%", right: "-10%", width: 360, height: 360, borderRadius: "50%", background: C.indigo, opacity: 0.13, filter: "blur(100px)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ position: "relative", padding: `${safeTop} 20px 16px`, display: "flex", alignItems: "center", gap: 14 }}>
        <button
          className="ff-btn" onClick={handleBack} aria-label="Kembali"
          style={{
            width: 40, height: 40, borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(255,255,255,0.7)", color: C.ink, cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><ChevronLeft size={20} strokeWidth={2.25} /></button>
        <div>
          <div style={{ fontSize: 11, color: C.mute, fontWeight: 700, letterSpacing: 0.4 }}>ISI DATA</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{gymShortName(gym)}</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ ...glass, border: "1px solid rgba(0,0,0,0.05)", borderRadius: 18, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: C.blue + "16", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <Package size={13} color={C.blue} strokeWidth={2.25} />
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Stok</span>
              <span style={{ fontSize: 12.5, color: C.sub }}> — botol baru yang dikirim hari ini</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: C.orange + "16", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <RotateCcw size={13} color={C.orange} strokeWidth={2.25} />
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Sisa</span>
              <span style={{ fontSize: 12.5, color: C.sub }}> — botol dari sesi sebelumnya yang diambil kembali</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flavor cards */}
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {flavors.map((flavor) => {
          const filled = values[flavor].stock !== "" || values[flavor].waste !== "";
          return (
            <div key={flavor} style={{
              ...glass, border: `1.5px solid ${filled ? C.indigo + "33" : "rgba(0,0,0,0.06)"}`,
              borderRadius: 22, padding: 18,
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 14 }}>{flavor}</div>
              <div style={{ display: "flex", gap: 12 }}>
                <StepperField label="STOK" icon={Package} color={C.blue} value={values[flavor].stock} onChange={(v) => setField(flavor, "stock", v)} />
                <StepperField label="SISA" icon={RotateCcw} color={C.orange} value={values[flavor].waste} onChange={(v) => setField(flavor, "waste", v)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom CTA */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, padding: `16px 20px ${safeBottom}`,
        background: "linear-gradient(0deg, rgba(243,243,247,0.98) 60%, rgba(243,243,247,0))",
        backdropFilter: "blur(6px)",
      }}>
        <div style={{ fontSize: 12, color: C.mute, textAlign: "center", marginBottom: 10 }}>
          {filledCount} dari {flavors.length} rasa terisi
        </div>
        <button
          className="ff-btn"
          onClick={() => canReview && onReviewSubmit(gym, values)}
          disabled={!canReview}
          style={{
            width: "100%", padding: "17px 16px", borderRadius: 18, border: "none",
            cursor: canReview ? "pointer" : "default",
            background: canReview ? C.indigo : "#D1D1D6",
            color: "#fff", fontSize: 16, fontWeight: 700,
            boxShadow: canReview ? "0 6px 20px rgba(94,92,230,0.35)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          Periksa & Kirim <ChevronRight size={18} strokeWidth={2.5} />
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
  const rows = flavors
    .filter(f => values[f].stock !== "" || values[f].waste !== "")
    .map(f => ({ flavor: f, stock: values[f].stock || "0", waste: values[f].waste || "0" }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,20,24,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, fontFamily: FONT,
    }}>
      <div style={{
        width: "100%", maxWidth: 480, background: "#fff", borderRadius: "28px 28px 0 0",
        padding: `28px 24px calc(${safeBottom} + 8px)`, boxShadow: "0 -10px 40px rgba(0,0,0,0.2)",
        maxHeight: "80vh", overflowY: "auto", animation: "ffRise 0.25s ease",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E5EA", margin: "0 auto 20px" }} />

        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: C.mute, fontWeight: 700, letterSpacing: 0.5 }}>KONFIRMASI</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, marginTop: 2 }}>{gymShortName(gym)}</div>
        </div>
        <p style={{ textAlign: "center", color: C.sub, fontSize: 13, margin: "6px 0 20px" }}>
          Cek lagi sebelum kirim. Pastikan semua angka sudah benar.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {rows.map(r => (
            <div key={r.flavor} style={{
              background: "#F7F7F9", borderRadius: 16, padding: "14px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{r.flavor}</span>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: C.blue, fontWeight: 700, letterSpacing: 0.3 }}>STOK</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{r.stock}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: C.orange, fontWeight: 700, letterSpacing: 0.3 }}>SISA</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{r.waste}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {rows.length > 1 && (
          <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 0 20px", borderTop: "1px solid #EFEFF2" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.blue, fontWeight: 700, letterSpacing: 0.3 }}>TOTAL STOK</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                {rows.reduce((sum, r) => sum + (parseInt(r.stock, 10) || 0), 0)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.orange, fontWeight: 700, letterSpacing: 0.3 }}>TOTAL SISA</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                {rows.reduce((sum, r) => sum + (parseInt(r.waste, 10) || 0), 0)}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="ff-btn" onClick={onCancel} disabled={submitting} style={{
            flex: 1, padding: "15px 16px", borderRadius: 16, border: "1.5px solid #E5E5EA",
            background: "#fff", color: C.sub, fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>
            Edit Lagi
          </button>
          <button className="ff-btn" onClick={onConfirm} disabled={submitting} style={{
            flex: 2, padding: "15px 16px", borderRadius: 16, border: "none",
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
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,20,24,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, fontFamily: FONT,
    }}>
      <div style={{
        background: "#fff", borderRadius: 28, padding: "36px 40px", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)", animation: "ffPop 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: C.green,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
        }}><Check size={30} strokeWidth={3} color="#fff" /></div>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{gymShortName(gym)} berhasil dikirim</div>
        <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>Lanjut ke gym berikutnya</div>
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

  // screen: "tray" | "form"
  const [screen, setScreen] = useState("tray");
  const [activeGym, setActiveGym] = useState(null);
  const [pendingValues, setPendingValues] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // completedToday: Set of gym names already submitted today. Keyed by todayKey()
  // so it naturally resets when the date rolls over (see loadCompletedToday).
  const [completedToday, setCompletedToday] = useState(new Set());
  const [savedValues, setSavedValues] = useState({}); // gym -> values, for editing before final submit and for session totals

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
      // silent fallback on failure — driver still works with FALLBACK_FLAVORS
    } catch {
      // silent — same fallback behavior as loadGymList
    }
  }, []);

  const loadCompletedToday = useCallback(async (token) => {
    // Resets naturally: this always asks the backend for "today" (todayKey()),
    // so a new day returns an empty set with zero client-side logic needed.
    try {
      const data = await callAppsScript({ action: "getTodayStatus", token, date: todayKey() });
      if (data.ok && Array.isArray(data.completedGyms)) {
        setCompletedToday(new Set(data.completedGyms));
      }
    } catch {
      // silent — driver can still work, checkmarks just won't be pre-filled
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
    } catch (err) {
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
    setScreen("form");
  };

  const handleReviewSubmit = (gym, values) => {
    setPendingValues(values);
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    setSubmitting(true);
    try {
      // Payload shape: gym, date, and per-flavor stock/waste. Waste is written
      // to the PREVIOUS session's Sisa column by default on the backend side —
      // this app just sends the raw numbers, the sheet-write logic (which
      // session to update) lives in Apps Script.
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
        setScreen("tray");
        setActiveGym(null);
        setPendingValues(null);
      }, 1200);
    } catch (err) {
      alert("Gagal mengirim data. Coba lagi. " + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  // Local-session totals for the header stat cards. Deliberately scoped to
  // "this session" (savedValues resets on logout) rather than "today" — the
  // backend only returns which gyms are done, not their submitted numbers,
  // so a true full-day total isn't available client-side without overclaiming.
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
        />
      )}
      {screen === "form" && activeGym && (
        <GymFormScreen
          gym={activeGym}
          flavors={flavors}
          initialData={savedValues[activeGym]}
          onBack={() => { setScreen("tray"); setActiveGym(null); }}
          onReviewSubmit={handleReviewSubmit}
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
