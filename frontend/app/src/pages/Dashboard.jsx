import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function parseJwt(token) {
  try { return JSON.parse(atob(token.split(".")[1])); }
  catch { return {}; }
}

function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ══════════════════════════════════════════
   STAT CARD
══════════════════════════════════════════ */
function StatCard({ iconEmoji, iconBg, label, sub, value, trend, trendColor = "#10b981", delay = 0, loading }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: "22px 22px 18px",
        boxShadow: hovered
          ? "0 8px 32px rgba(15,23,42,0.10)"
          : "0 1px 3px rgba(15,23,42,0.06), 0 2px 12px rgba(15,23,42,0.04)",
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "box-shadow 0.2s, transform 0.2s",
        animation: `fadeUp 0.45s ease ${delay}s both`,
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, lineHeight: 1,
        }}>
          {iconEmoji}
        </div>
        {trend != null && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: trendColor,
            fontFamily: "'DM Mono', monospace",
            display: "flex", alignItems: "center", gap: 3,
            background: trendColor + "18",
            padding: "3px 9px", borderRadius: 20,
          }}>
            ↗ {trend}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{
          width: 90, height: 34, borderRadius: 8, marginBottom: 8,
          background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf3 50%,#f1f5f9 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.3s infinite",
        }} />
      ) : (
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 800, fontSize: 32,
          color: "#0f172a", letterSpacing: "-0.02em",
          lineHeight: 1.1, marginBottom: 5,
        }}>
          {value}
        </div>
      )}

      <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const navigate = useNavigate();

  const token   = localStorage.getItem("fs_token");
  const payload = token ? parseJwt(token) : {};

  // ✅ Utilise username du JWT, sinon fallback sur email
  const name = payload.username
    ? payload.username.replace(/\b\w/g, c => c.toUpperCase())
    : payload.email?.split("@")[0]?.replace(/\b\w/g, c => c.toUpperCase()) || "Utilisateur";

  const role = payload.role
    ? payload.role.charAt(0).toUpperCase() + payload.role.slice(1)
    : "Analyste";

  useEffect(() => { if (!token) navigate("/"); }, [token, navigate]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel   = "stylesheet";
    link.href  = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("http://127.0.0.1:5000/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => { setError("Impossible de charger les statistiques."); setLoading(false); });
  }, [token]);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const primaryCards = [
    {
      iconEmoji: "〰️", iconBg: "#eff6ff",
      label: "Transactions totales", sub: "Cette semaine",
      value: stats ? stats.totalTransactions?.toLocaleString("fr-FR") : null,
      trend: "+12%", trendColor: "#10b981",
    },
    {
      iconEmoji: "🛡️", iconBg: "#fff1f2",
      label: "Fraudes détectées",
      sub: stats ? `${stats.fraudDetected} alertes générées` : "—",
      value: stats ? String(stats.fraudDetected) : null,
      trend: null,
    },
    {
      iconEmoji: "✅", iconBg: "#f0fdf4",
      label: "Taux de validation", sub: "Transactions légitimes",
      value: stats ? `${stats.validationRate}%` : null,
      trend: "+0.4%", trendColor: "#10b981",
    },
    {
      iconEmoji: "💲", iconBg: "#fefce8",
      label: "Montant risqué", sub: "Fraudes détectées",
      value: stats ? fmt(stats.riskAmount) + " €" : null,
      trend: null,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.3; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* ══ NAVBAR ══ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#ffffff",
        borderBottom: "1px solid #e8edf3",
        height: 62,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 36px",
        boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 9, height: 9, borderRadius: "50%",
            background: "#22c55e", display: "inline-block",
            boxShadow: "0 0 7px #22c55e",
            animation: "blink 2.5s infinite",
          }} />
          <span style={{
            fontSize: 13, color: "#64748b",
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em",
          }}>Surveillance active</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ position: "relative", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>
            🔔
            <span style={{
              position: "absolute", top: -6, right: -8,
              background: "#ef4444", color: "#fff",
              fontSize: 9, fontWeight: 800,
              width: 17, height: 17, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid #fff",
              fontFamily: "'DM Mono', monospace",
            }}>3</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "linear-gradient(135deg,#3b82f6,#0ea5e9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 14,
              boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
            }}>{initials(name)}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em" }}>{role}</div>
            </div>
          </div>

          <button
            onClick={() => { localStorage.removeItem("fs_token"); navigate("/"); }}
            style={{
              padding: "6px 14px", borderRadius: 8,
              background: "none", border: "1px solid #e2e8f0",
              color: "#64748b", fontSize: 11, cursor: "pointer",
              fontFamily: "'DM Mono', monospace", letterSpacing: "0.07em",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#ef4444"; e.currentTarget.style.color="#ef4444"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.color="#64748b"; }}
          >DÉCONNEXION</button>
        </div>
      </nav>

      {/* ══ MAIN ══ */}
      <main style={{ padding: "30px 40px", maxWidth: 1280, margin: "0 auto" }}>

        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: 26,
          animation: "fadeUp 0.4s ease both",
        }}>
          <div>
            <h1 style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 800, fontSize: 26,
              color: "#0f172a", margin: "0 0 5px",
            }}>Bonjour, {name.split(" ")[0]} 👋</h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
              Voici le résumé de la surveillance cette semaine — {today}
            </p>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px",
            background: "#fff5f5", border: "1px solid #fecaca",
            borderRadius: 12, cursor: "pointer",
            transition: "box-shadow 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 16px rgba(239,68,68,0.15)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow="none"}
          >
            <span style={{ fontSize: 14 }}>🛡️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>3 alertes critiques</span>
          </div>
        </div>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "13px 18px",
            color: "#dc2626", fontSize: 13, marginBottom: 22,
            fontFamily: "'DM Mono', monospace",
          }}>⚠️ {error}</div>
        )}

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          gap: 18, marginBottom: 32,
        }}>
          {primaryCards.map((c, i) => (
            <StatCard key={c.label} {...c} delay={0.05 * i} loading={loading} />
          ))}
        </div>

        <div style={{
          background: "#fff", borderRadius: 18,
          padding: "32px", textAlign: "center",
          boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
          border: "1.5px dashed #e2e8f0",
          animation: "fadeUp 0.5s ease 0.45s both",
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 5 }}>
            Graphiques & analyses détaillées
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>
            Section en cours de développement
          </div>
        </div>
      </main>
    </div>
  );
}
