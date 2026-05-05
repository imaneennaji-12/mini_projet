import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

/* Helpers */
function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function StatCard({
  iconEmoji,
  iconBg,
  label,
  sub,
  value,
  trend,
  trendColor = "#10b981",
  delay = 0,
  loading,
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="stat-card"
      style={{
        animationDelay: `${delay}s`,
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered
          ? "0 8px 32px rgba(15,23,42,0.10)"
          : "0 1px 3px rgba(15,23,42,0.06), 0 2px 12px rgba(15,23,42,0.04)",
      }}
    >
      <div className="stat-card-header">
        <div className="stat-icon" style={{ background: iconBg }}>
          {iconEmoji}
        </div>
        {trend != null && (
          <span
            className="stat-trend"
            style={{ color: trendColor, background: trendColor + "18" }}
          >
            ↗ {trend}
          </span>
        )}
      </div>
      {loading ? (
        <div className="stat-skeleton" />
      ) : (
        <div className="stat-value">{value}</div>
      )}
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("fs_token");

  useEffect(() => {
    if (!token) navigate("/");
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    fetch("http://127.0.0.1:5000/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger les statistiques.");
        setLoading(false);
      });
  }, [token]);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const primaryCards = [
    {
      iconEmoji: "〰️",
      iconBg: "#eff6ff",
      label: "Transactions totales",
      sub: "Cette semaine",
      value: stats ? stats.totalTransactions?.toLocaleString("fr-FR") : null,
      trend: "+12%",
      trendColor: "#10b981",
    },
    {
      iconEmoji: "🛡️",
      iconBg: "#fff1f2",
      label: "Fraudes détectées",
      sub: stats ? `${stats.fraudDetected} alertes générées` : "—",
      value: stats ? String(stats.fraudDetected) : null,
      trend: null,
    },
    {
      iconEmoji: "✅",
      iconBg: "#f0fdf4",
      label: "Taux de validation",
      sub: "Transactions légitimes",
      value: stats ? `${stats.validationRate}%` : null,
      trend: "+0.4%",
      trendColor: "#10b981",
    },
    {
      iconEmoji: "💲",
      iconBg: "#fefce8",
      label: "Montant risqué",
      sub: "Fraudes détectées",
      value: stats ? fmt(stats.riskAmount) + " MAD" : null,
      trend: null,
    },
  ];

  return (
    <div className="dashboard-page">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .stat-skeleton {
          width: 90px; height: 34px; border-radius: 8px; margin-bottom: 8px;
          background: linear-gradient(90deg,#f1f5f9 25%,#e8edf3 50%,#f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.3s infinite;
        }
      `}</style>

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Bonjour, {name.split(" ")[0]} 👋</h1>
          <p className="dashboard-subtitle">
            Voici le résumé de la surveillance cette semaine — {today}
          </p>
        </div>
        <div className="dashboard-alert">
          <span>🛡️</span>
          <span>3 alertes critiques</span>
        </div>
      </div>

      {error && <div className="dashboard-error">⚠️ {error}</div>}

      <div className="stats-grid">
        {primaryCards.map((c, i) => (
          <StatCard key={c.label} {...c} delay={0.05 * i} loading={loading} />
        ))}
      </div>

      <div className="dashboard-placeholder">
        <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: "#0f172a",
            marginBottom: 5,
          }}
        >
          Graphiques & analyses détaillées
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#94a3b8",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          Section en cours de développement
        </div>
      </div>
    </div>
  );
}
