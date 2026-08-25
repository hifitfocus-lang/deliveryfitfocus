import { useState, useCallback, useMemo, useEffect } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Same Apps Script backend as the main dashboard — GET-based due to the
// Apps Script Web App redirect dropping POST bodies (see dashboard notes).
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyjae8ljZwXp3pdcxqV5B-MhiQc3PCwEAvf2MMYV29E0qMprWulUZwa4dlCpMZJ9tkc/exec";

// Fallback lists used only if the sheet fetch hasn't resolved yet —
// the real lists always come live from Apps Script once connected, so a
// flavor swap in the sheet (e.g. Milky Dew -> Red Velvet) or a gym change
// shows up automatically without touching this file.
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

// ── DESIGN TOKENS (matched to main dashboard) ─────────────────────────────────
const C = {
  indigo: "#5E5CE6",
  green: "#34C759",
  orange: "#FF9500",
  blue: "#0A84FF",
  red: "#FF3B30",
  ink: "#1D1D1F",
  sub: "#6E6E73",
  mute: "#8E8E93",
  faint: "#AEAEB2",
  line: "#E5E5EA",
};

const bgGradient = "linear-gradient(160deg,#F1F0F8 0%,#F6F6FA 45%,#F3F8F4 100%)";
const glass = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  boxShadow: "7px 7px 16px rgba(148,148,180,0.16), -7px -7px 16px rgba(255,255,255,0.75), inset 0 1px 0 rgba(255,255,255,0.5)",
};

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

  return (
    <div style={{
      minHeight: "100vh", position: "relative", background: bgGradient,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',system-ui,sans-serif",
      letterSpacing: "-0.01em", overflow: "hidden",
    }}>
      <div style={{ position: "fixed", top: "-15%", left: "-12%", width: 420, height: 420, borderRadius: "50%", background: C.indigo, opacity: 0.18, filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-10%", right: "-12%", width: 400, height: 400, borderRadius: "50%", background: C.green, opacity: 0.14, filter: "blur(110px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", ...glass, border: "1px solid rgba(255,255,255,0.6)", borderRadius: 32, padding: "40px 28px", width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <LogoMark size={80} />
        <h1 style={{ color: C.ink, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: "6px 0 2px" }}>FitFocus Driver</h1>
        <p style={{ color: C.mute, fontSize: 13, margin: "0 0 28px" }}>Enter your PIN to start</p>

        {/* PIN dots */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28, animation: error ? "ffShake 0.4s" : "none" }}>
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
          {["1","2","3","4","5","6","7","8","9"].map(n => (
            <button key={n} onClick={() => tap(n)} disabled={loading || pin.length >= 4}
              style={{
                aspectRatio: "1", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)",
                background: "rgba(255,255,255,0.8)", fontSize: 26, fontWeight: 600, color: C.ink,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>{n}</button>
          ))}
          <div />
          <button onClick={() => tap("0")} disabled={loading || pin.length >= 4}
            style={{
              aspectRatio: "1", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)",
              background: "rgba(255,255,255,0.8)", fontSize: 26, fontWeight: 600, color: C.ink,
              cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>0</button>
          <button onClick={backspace} disabled={loading}
            style={{
              aspectRatio: "1", borderRadius: 20, border: "none", background: "transparent",
              fontSize: 20, color: C.mute, cursor: "pointer", fontFamily: "inherit",
            }}>⌫</button>
        </div>

        <button
          onClick={() => pin.length === 4 && !loading && onSubmit(pin)}
          disabled={pin.length !== 4 || loading}
          style={{
            width: "100%", padding: "15px 16px", borderRadius: 16, border: "none",
            cursor: pin.length === 4 && !loading ? "pointer" : "default",
            background: pin.length === 4 ? C.indigo : "#D1D1D6",
            color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "inherit",
            boxShadow: pin.length === 4 ? "0 4px 16px rgba(94,92,230,0.35)" : "none",
            transition: "background 0.15s",
          }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {error && (
          <div style={{ marginTop: 16, background: "#FFF1F0", color: "#D70015", padding: "10px 18px", borderRadius: 12, fontSize: 13, textAlign: "center" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TRAY (GYM GRID) ───────────────────────────────────────────────────────────
function TrayScreen({ gyms, completedToday, onSelectGym, driverName, onLogout, syncStatus }) {
  const doneCount = gyms.filter(g => completedToday.has(g)).length;
  const allDone = doneCount === gyms.length && gyms.length > 0;
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", position: "relative", background: bgGradient,
      fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',system-ui,sans-serif",
      letterSpacing: "-0.01em", paddingBottom: 40,
    }}>
      <div style={{ position: "fixed", top: "-12%", left: "-10%", width: 380, height: 380, borderRadius: "50%", background: C.indigo, opacity: 0.14, filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-8%", right: "-10%", width: 360, height: 360, borderRadius: "50%", background: C.green, opacity: 0.12, filter: "blur(100px)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ position: "relative", padding: "24px 20px 18px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ width: 44 }} />
          <LogoMark size={52} />
          <button onClick={() => setConfirmingLogout(true)} style={{
            width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(255,255,255,0.6)", color: C.mute, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>Out</button>
        </div>
        <div style={{ color: C.ink, fontSize: 15, fontWeight: 700, marginTop: 6 }}>{todayLabel()}</div>
        {driverName && <div style={{ color: C.mute, fontSize: 12, marginTop: 2 }}>{driverName}</div>}
      </div>

      {/* Progress banner */}
      <div style={{ padding: "0 20px 18px" }}>
        <div style={{
          ...glass, border: `1px solid ${allDone ? C.green + "44" : C.indigo + "33"}`,
          borderRadius: 20, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 12, color: C.mute, fontWeight: 600, marginBottom: 3 }}>PROGRESS TODAY</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: allDone ? C.green : C.ink }}>
              {doneCount} / {gyms.length} gym {allDone ? "— done! 🎉" : "selesai"}
            </div>
          </div>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: `conic-gradient(${allDone ? C.green : C.indigo} ${gyms.length ? (doneCount / gyms.length) * 360 : 0}deg, #E5E5EA 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: allDone ? C.green : C.indigo }}>
              {gyms.length ? Math.round((doneCount / gyms.length) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Gym tray grid */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ fontSize: 12, color: C.mute, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12, paddingLeft: 4 }}>
          TAP A GYM TO START
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
          {gyms.map((gym) => {
            const done = completedToday.has(gym);
            return (
              <button
                key={gym}
                onClick={() => onSelectGym(gym)}
                style={{
                  position: "relative", ...glass,
                  border: `1.5px solid ${done ? C.green + "55" : "rgba(0,0,0,0.06)"}`,
                  borderRadius: 22, padding: "22px 14px", minHeight: 108,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                  background: done ? "rgba(52,199,89,0.08)" : glass.background,
                }}>
                {done && (
                  <div style={{
                    position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: "50%",
                    background: C.green, color: "#fff", fontSize: 12, fontWeight: 900,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>✓</div>
                )}
                <div style={{ fontSize: 15, fontWeight: 700, color: done ? C.green : C.ink, lineHeight: 1.25 }}>
                  {gymShortName(gym)}
                </div>
                <div style={{ fontSize: 11, color: done ? C.green + "99" : C.faint, marginTop: 4 }}>
                  {done ? "Sudah diisi · ketuk untuk edit" : "Belum diisi"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {syncStatus && (
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: C.faint }}>{syncStatus}</div>
      )}

      {confirmingLogout && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(20,20,24,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24,
        }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: "24px 22px", width: "100%", maxWidth: 320, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Keluar dari akun?</div>
            <p style={{ fontSize: 13, color: C.sub, margin: "0 0 20px" }}>
              Progres hari ini yang sudah dikirim tetap tersimpan, tapi kamu harus login PIN lagi.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmingLogout(false)} style={{
                flex: 1, padding: "13px 14px", borderRadius: 14, border: "1.5px solid #E5E5EA",
                background: "#fff", color: C.sub, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Batal</button>
              <button onClick={onLogout} style={{
                flex: 1, padding: "13px 14px", borderRadius: 14, border: "none",
                background: C.red, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Keluar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── NUMBER FIELD (native numeric keypad trigger) ──────────────────────────────
function NumberField({ label, value, onChange, color, icon }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: 0.3 }}>{label}</span>
      </div>
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, "");
          onChange(v);
        }}
        onFocus={(e) => e.target.select()}
        placeholder="0"
        style={{
          width: "100%", boxSizing: "border-box", textAlign: "center",
          fontSize: 32, fontWeight: 800, color: C.ink, fontFamily: "inherit",
          padding: "16px 8px", borderRadius: 16,
          border: `2px solid ${value ? color + "66" : "rgba(0,0,0,0.08)"}`,
          background: value ? color + "0d" : "rgba(255,255,255,0.7)",
          outline: "none",
        }}
      />
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

  const setField = (flavor, field, val) => {
    setValues(prev => ({ ...prev, [flavor]: { ...prev[flavor], [field]: val } }));
  };

  const filledCount = flavors.filter(f => values[f].stock !== "" || values[f].waste !== "").length;
  const canReview = filledCount > 0;

  return (
    <div style={{
      minHeight: "100vh", position: "relative", background: bgGradient,
      fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',system-ui,sans-serif",
      letterSpacing: "-0.01em", paddingBottom: 120,
    }}>
      <div style={{ position: "fixed", top: "-12%", right: "-10%", width: 360, height: 360, borderRadius: "50%", background: C.indigo, opacity: 0.13, filter: "blur(100px)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ position: "relative", padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => {
            if (filledCount > 0 && !confirm("Ada data yang belum dikirim. Yakin mau kembali? Isian akan hilang.")) return;
            onBack();
          }}
          style={{
            width: 40, height: 40, borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(255,255,255,0.7)", fontSize: 18, color: C.ink, cursor: "pointer", flexShrink: 0,
          }}>←</button>
        <div>
          <div style={{ fontSize: 11, color: C.mute, fontWeight: 600 }}>MENGISI DATA</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{gymShortName(gym)}</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ ...glass, border: "1px solid rgba(0,0,0,0.05)", borderRadius: 16, padding: "12px 16px", display: "flex", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: C.blue }} />
            <span style={{ fontSize: 12, color: C.sub }}>Stock = botol baru</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: C.orange }} />
            <span style={{ fontSize: 12, color: C.sub }}>Waste = sisa diambil</span>
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
                <NumberField
                  label="STOCK"
                  icon="📦"
                  color={C.blue}
                  value={values[flavor].stock}
                  onChange={(v) => setField(flavor, "stock", v)}
                />
                <NumberField
                  label="WASTE"
                  icon="🗑️"
                  color={C.orange}
                  value={values[flavor].waste}
                  onChange={(v) => setField(flavor, "waste", v)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom CTA */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 20px 24px",
        background: "linear-gradient(0deg, rgba(243,243,247,0.98) 60%, rgba(243,243,247,0))",
        backdropFilter: "blur(6px)",
      }}>
        <div style={{ fontSize: 12, color: C.mute, textAlign: "center", marginBottom: 10 }}>
          {filledCount} dari {flavors.length} rasa terisi
        </div>
        <button
          onClick={() => canReview && onReviewSubmit(gym, values)}
          disabled={!canReview}
          style={{
            width: "100%", padding: "17px 16px", borderRadius: 18, border: "none",
            cursor: canReview ? "pointer" : "default",
            background: canReview ? C.indigo : "#D1D1D6",
            color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "inherit",
            boxShadow: canReview ? "0 6px 20px rgba(94,92,230,0.35)" : "none",
          }}>
          Review & Kirim →
        </button>
      </div>
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
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100,
      fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',system-ui,sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 480, background: "#fff", borderRadius: "28px 28px 0 0",
        padding: "28px 24px 32px", boxShadow: "0 -10px 40px rgba(0,0,0,0.2)",
        maxHeight: "80vh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E5EA", margin: "0 auto 20px" }} />

        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: C.mute, fontWeight: 700, letterSpacing: 0.5 }}>KONFIRMASI</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, marginTop: 2 }}>{gymShortName(gym)}</div>
        </div>
        <p style={{ textAlign: "center", color: C.sub, fontSize: 13, margin: "6px 0 20px" }}>
          Cek lagi sebelum kirim — pastikan angkanya sudah benar
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
                  <div style={{ fontSize: 9, color: C.blue, fontWeight: 700 }}>STOCK</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{r.stock}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: C.orange, fontWeight: 700 }}>WASTE</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{r.waste}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {rows.length > 1 && (
          <div style={{
            display: "flex", justifyContent: "space-around", padding: "10px 0 20px",
            borderTop: "1px solid #EFEFF2",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.blue, fontWeight: 700 }}>TOTAL STOCK</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>
                {rows.reduce((sum, r) => sum + (parseInt(r.stock, 10) || 0), 0)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.orange, fontWeight: 700 }}>TOTAL WASTE</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>
                {rows.reduce((sum, r) => sum + (parseInt(r.waste, 10) || 0), 0)}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={submitting} style={{
            flex: 1, padding: "15px 16px", borderRadius: 16, border: "1.5px solid #E5E5EA",
            background: "#fff", color: C.sub, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            Edit Lagi
          </button>
          <button onClick={onConfirm} disabled={submitting} style={{
            flex: 2, padding: "15px 16px", borderRadius: 16, border: "none",
            background: C.green, color: "#fff", fontSize: 15, fontWeight: 700, cursor: submitting ? "default" : "pointer",
            fontFamily: "inherit", boxShadow: "0 6px 20px rgba(52,199,89,0.35)",
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? "Mengirim…" : "✓ Ya, Sudah Benar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SUCCESS TOAST ─────────────────────────────────────────────────────────────
function SuccessOverlay({ gym }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,20,24,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }}>
      <div style={{
        background: "#fff", borderRadius: 28, padding: "36px 40px", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)", animation: "ffPop 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <style>{`@keyframes ffPop{0%{transform:scale(0.7);opacity:0;}100%{transform:scale(1);opacity:1;}}`}</style>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: C.green,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, color: "#fff", margin: "0 auto 16px", fontWeight: 900,
        }}>✓</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{gymShortName(gym)} tersimpan</div>
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

  // screen: "tray" | "form" | gym name string when in confirm
  const [screen, setScreen] = useState("tray");
  const [activeGym, setActiveGym] = useState(null);
  const [pendingValues, setPendingValues] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // completedToday: Set of gym names already submitted today. Keyed by todayKey()
  // so it naturally resets when the date rolls over (see loadCompletedToday).
  const [completedToday, setCompletedToday] = useState(new Set());
  const [savedValues, setSavedValues] = useState({}); // gym -> values, for editing before final submit

  const loadGymList = useCallback(async (token) => {
    try {
      const data = await callAppsScript({ action: "getGymList", token });
      if (data.ok && Array.isArray(data.gyms) && data.gyms.length) {
        setGyms(data.gyms);
        setSyncStatus("");
      } else {
        setSyncStatus("Pakai daftar gym default — belum tersambung ke sheet");
      }
    } catch {
      setSyncStatus("Pakai daftar gym default — belum tersambung ke sheet");
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
        setLoginError(data.error || "PIN salah, coba lagi");
      }
    } catch (err) {
      setLoginError("Tidak bisa connect — cek koneksi internet");
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
      alert("Gagal mengirim data. Coba lagi — " + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!authToken) {
    return <LoginScreen onSubmit={handleLogin} loading={loginLoading} error={loginError} />;
  }

  return (
    <>
      {screen === "tray" && (
        <TrayScreen
          gyms={gyms}
          completedToday={completedToday}
          onSelectGym={handleSelectGym}
          driverName={driverName}
          onLogout={handleLogout}
          syncStatus={syncStatus}
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
