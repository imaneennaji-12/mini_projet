import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

import "./Dashboard.css";

function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  fontFamily: "'DM Mono', monospace",
  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
};

function StatCard({ icon: Icon, label, value, sub, iconBg, loading, delay }) {
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}s` }}>
      <div className="stat-top">
        <div className="stat-icon" style={{ background: iconBg }}>
          <Icon size={20} />
        </div>
      </div>

      {loading ? (
        <div className="stat-skeleton" />
      ) : (
        <div className="stat-value">{value}</div>
      )}

      <div className="stat-label">{label}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const displayName =
    user?.prenom && user?.nom
      ? `${user.prenom} ${user.nom}`
      : user?.nom || "Utilisateur";

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    if (!token) return;

    api
      .get("/stats")
      .then((res) => {
        setStats(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const cards = [
    {
      icon: Activity,
      label: "Transactions",
      value: stats?.totalTransactions?.toLocaleString(),
      sub: "Cette semaine",
      iconBg: "#eff6ff",
    },
    {
      icon: ShieldAlert,
      label: "Fraudes",
      value: stats?.fraudDetected,
      sub: "Détectées",
      iconBg: "#fff1f2",
    },
    {
      icon: CheckCircle2,
      label: "Validation",
      value: `${stats?.validationRate ?? 0}%`,
      sub: "Taux",
      iconBg: "#f0fdf4",
    },
    {
      icon: DollarSign,
      label: "Montant risqué",
      value: fmt(stats?.riskAmount),
      sub: "MAD",
      iconBg: "#fefce8",
    },
    {
      icon: XCircle,
      label: "Refus",
      value: `${stats?.refusalRate ?? 0}%`,
      sub: "Transactions",
      iconBg: "#fff7ed",
    },
    {
      icon: Clock,
      label: "Investigations",
      value: stats?.openInvestigations,
      sub: "Ouvertes",
      iconBg: "#eef2ff",
    },
    {
      icon: AlertTriangle,
      label: "Score risque",
      value: stats?.avgRiskScore,
      sub: "Moyen",
      iconBg: "#fef3c7",
    },
  ];

  return (
    <div className="dashboard-root">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Bonjour {displayName} 👋</h1>
            <p>Résumé du système — {today}</p>
          </div>
        </div>

        {/* CARDS */}
        <div className="cards-grid">
          {cards.map((c, i) => (
            <StatCard key={c.label} {...c} loading={loading} delay={i * 0.05} />
          ))}
        </div>

        {/* CHARTS */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Fraudes vs Transactions</h3>

            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.dailyData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />

                <Bar dataKey="transactions_legitimes" fill="#22c55e" />
                <Bar dataKey="fraudes" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Risque</h3>

            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats?.riskDistribution || []}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={90}
                >
                  {(stats?.riskDistribution || []).map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
