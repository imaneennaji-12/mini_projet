import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useSocket } from "../hooks/useSocket";
import i18n from "../i18n";
import { useTranslation } from "react-i18next"; // ← AJOUT

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

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  loading,
  delay,
  trend,
  trendColor = "#10b981",
}) {
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}s` }}>
      <div className="stat-top">
        <div className="stat-icon" style={{ background: iconBg }}>
          <Icon size={20} />
        </div>
        {trend != null && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: trendColor,
              background: trendColor + "18",
              padding: "2px 8px",
              borderRadius: 6,
            }}
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
  const { t } = useTranslation(); // ← AJOUT
  const { user, token } = useAuth();
  const { socketRef, connected } = useSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName =
    user?.prenom && user?.nom
      ? `${user.prenom} ${user.nom}`
      : user?.nom || "Utilisateur";

  const today = new Date().toLocaleDateString(
    i18n.language === "en" ? "en-US" : "fr-FR",
    { weekday: "long", day: "numeric", month: "long" },
  );

  useEffect(() => {
    if (!token) return;
    api
      .get("/stats")
      .then((res) => {
        setStats(res);
        setLoading(false);
      })
      .catch(() => {
        setError(t("transactions.error"));
        setLoading(false);
      });
  }, [token, t]);

  useEffect(() => {
    if (!connected) return;
    const socket = socketRef.current;
    if (!socket) return;
    const handleRefresh = () =>
      api
        .get("/stats")
        .then((data) => setStats(data))
        .catch(console.error);
    socket.on("new_transaction", handleRefresh);
    socket.on("transaction_updated", handleRefresh);
    socket.on("investigation_resolved", handleRefresh);
    return () => {
      socket.off("new_transaction", handleRefresh);
      socket.off("transaction_updated", handleRefresh);
      socket.off("investigation_resolved", handleRefresh);
    };
  }, [connected]);

  const dailyData = stats?.dailyData || [];
  const riskDistribution = stats?.riskDistribution || [];

  const cards = [
    {
      icon: Activity,
      iconBg: "#eff6ff",
      label: t("dashboard.totalTransactions"),
      sub: t("dashboard.thisWeek"),
      value: stats?.totalTransactions?.toLocaleString(
        i18n.language === "en" ? "en-US" : "fr-FR",
      ),
      trend: "+12%",
      trendColor: "#10b981",
    },
    {
      icon: ShieldAlert,
      iconBg: "#fff1f2",
      label: t("dashboard.fraudsDetected"),
      sub: `${stats?.fraudDetected ?? "—"} ${t("dashboard.alertsGenerated")}`,
      value: stats ? String(stats.fraudDetected) : null,
    },
    {
      icon: CheckCircle2,
      iconBg: "#f0fdf4",
      label: t("dashboard.validationRate"),
      sub: t("dashboard.legitTransactions"),
      value: stats ? `${stats.validationRate}%` : null,
      trend: "+0.4%",
      trendColor: "#10b981",
    },
    {
      icon: DollarSign,
      iconBg: "#fefce8",
      label: t("dashboard.riskAmount"),
      sub: t("dashboard.fraudsDetectedShort"),
      value: stats ? fmt(stats.riskAmount) + " MAD" : null,
    },
    {
      icon: XCircle,
      iconBg: "#fff7ed",
      label: t("dashboard.refusalRate"),
      sub: t("dashboard.blockedTransactions"),
      value: stats ? `${stats.refusalRate}%` : null,
    },
    {
      icon: Clock,
      iconBg: "#eef2ff",
      label: t("dashboard.openInvestigations"),
      sub: t("dashboard.pendingTreatment"),
      value: stats ? stats.openInvestigations : null,
    },
    {
      icon: AlertTriangle,
      iconBg: "#fef3c7",
      label: t("dashboard.avgRiskScore"),
      sub: t("dashboard.on100"),
      value: stats ? stats.avgRiskScore : null,
    },
    {
      icon: AlertTriangle,
      iconBg: "#fee2e2",
      label: t("dashboard.totalAlerts"),
      sub: t("dashboard.allPriorities"),
      value: stats ? stats.totalAlerts : null,
    },
  ];

  return (
    <div className="dashboard-root">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>
              {t("dashboard.hello")} {displayName} 👋
            </h1>
            <p>
              {t("dashboard.systemSummary")} — {today}
            </p>
          </div>
        </div>

        {error && (
          <div style={{ color: "#dc2626", marginBottom: 16 }}>⚠️ {error}</div>
        )}

        <div className="cards-grid">
          {cards.map((c, i) => (
            <StatCard key={c.label} {...c} loading={loading} delay={i * 0.05} />
          ))}
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>{t("dashboard.legitVsFrauds")}</h3>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={dailyData}
                barCategoryGap="30%"
                barGap={4}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{
                    fontSize: 12,
                    fill: "#94a3b8",
                    fontFamily: "'DM Mono', monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: 12,
                    fontFamily: "'DM Mono', monospace",
                    paddingTop: 12,
                  }}
                  formatter={(v) =>
                    v === "transactions_legitimes"
                      ? t("dashboard.legit")
                      : t("dashboard.frauds")
                  }
                />
                <Bar
                  dataKey="transactions_legitimes"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="fraudes" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>{t("dashboard.riskDistribution")}</h3>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                >
                  {riskDistribution.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(value, entry) => (
                    <span
                      style={{
                        color: "#374151",
                        fontSize: 13,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {t("dashboard.risk")} {entry.payload.name}
                    </span>
                  )}
                  wrapperStyle={{
                    fontFamily: "'DM Mono', monospace",
                    paddingTop: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>{t("dashboard.validationEvolution")}</h3>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart
                data={dailyData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{
                    fontSize: 12,
                    fill: "#94a3b8",
                    fontFamily: "'DM Mono', monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: 12,
                    fontFamily: "'DM Mono', monospace",
                    paddingTop: 12,
                  }}
                  formatter={(v) =>
                    v === "validees"
                      ? t("dashboard.validated")
                      : t("dashboard.refused")
                  }
                />
                <Line
                  type="monotone"
                  dataKey="validees"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#10b981" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="refusees"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#ef4444" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>{t("dashboard.fraudsByCategory")}</h3>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                layout="vertical"
                data={stats?.fraudByCategory || []}
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={80}
                  tick={{
                    fontSize: 12,
                    fill: "#374151",
                    fontFamily: "'DM Mono', monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
