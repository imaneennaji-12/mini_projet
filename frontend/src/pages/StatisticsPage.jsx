import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
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
import "./StatisticsPage.css";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useSocket } from "../hooks/useSocket";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import RapportCard from "../components/RapportCard";

function fmt(n) {
  if (n === null || n === undefined) return "—";
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
  background: "#fff",
};

function ChartCard({ title, sub, children }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-sub">{sub}</div>
      {children}
    </div>
  );
}

export default function Statistics() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { socketRef, connected } = useSocket();
  const { token } = useAuth();

  const fraudHourData = stats?.fraudHourData || [];
  const scatterData = stats?.scatterData || [];
  const cityFraudData = stats?.cityFraudData || [];
  const amountByDay = stats?.amountByDay || [];
  const fraudTypeData = stats?.fraudTypeData || [];
  const decisionsByDay = stats?.decisionsByDay || [];

  useEffect(() => {
    if (!token) navigate("/", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    api
      .get("/stats/advanced")
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => {
        setError(t("statistics.error"));
        setLoading(false);
      });
  }, [token, t]);

  useEffect(() => {
    if (!token || !connected) return;
    const socket = socketRef.current;
    if (!socket) return;
    const handleRefresh = () =>
      api
        .get("/stats/advanced")
        .then((d) => setStats(d))
        .catch(console.error);
    socket.on("new_transaction", handleRefresh);
    socket.on("transaction_updated", handleRefresh);
    socket.on("investigation_resolved", handleRefresh);
    return () => {
      socket.off("new_transaction", handleRefresh);
      socket.off("transaction_updated", handleRefresh);
      socket.off("investigation_resolved", handleRefresh);
    };
  }, [token, connected]);

  const today = new Date().toLocaleDateString(
    i18n.language === "en" ? "en-US" : "fr-FR",
    { weekday: "long", day: "numeric", month: "long" },
  );

  return (
    <div className="stats-root">
      <main className="main-content">
        <div className="header-row">
          <div>
            <h1 className="header-title">{t("statistics.title")} 📊</h1>
            <p className="header-sub">
              {t("statistics.subtitle")} — {today}
            </p>
          </div>
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}
        <RapportCard stats={stats} loading={loading} />

        <div className="charts-grid">
          <ChartCard
            title={t("statistics.fraudsByHour")}
            sub={t("statistics.fraudsByHourSub")}
          >
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={fraudHourData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hour"
                    tick={{
                      fontSize: 11,
                      fill: "#94a3b8",
                      fontFamily: "'DM Mono', monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [v, t("dashboard.frauds")]}
                    labelFormatter={(l) => `${l}h00`}
                  />
                  <Bar dataKey="fraudes" radius={[4, 4, 0, 0]}>
                    {fraudHourData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`hsl(${260 + i * 3}, 70%, ${50 + (i % 4) * 5}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title={t("statistics.amountByDay")}
            sub={t("statistics.amountByDaySub")}
          >
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={amountByDay}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#ef4444"
                        stopOpacity={0.03}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{
                      fontSize: 11,
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
                    tickFormatter={(v) => fmt(v)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [fmt(v) + " MAD", t("statistics.amount")]}
                  />
                  <Area
                    type="monotone"
                    dataKey="montant"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fill="url(#gAmt)"
                    dot={{ r: 4, fill: "#ef4444" }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title={t("statistics.topCities")}
            sub={t("statistics.topCitiesSub")}
          >
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={cityFraudData}
                  margin={{ top: 5, right: 20, left: 5, bottom: 0 }}
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
                    dataKey="city"
                    width={80}
                    tick={{
                      fontSize: 11,
                      fill: "#374151",
                      fontFamily: "'DM Mono', monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [v, t("dashboard.frauds")]}
                  />
                  <Bar dataKey="fraudes" radius={[0, 4, 4, 0]}>
                    {cityFraudData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`hsl(${210 + i * 18}, 75%, ${52 + i * 3}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title={t("statistics.decisionsByDay")}
            sub={t("statistics.decisionsByDaySub")}
          >
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={decisionsByDay}
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
                      fontSize: 11,
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
                      fontSize: 11,
                      fontFamily: "'DM Mono', monospace",
                      paddingTop: 10,
                    }}
                    formatter={(v) =>
                      v === "approuve"
                        ? t("statistics.approved")
                        : t("statistics.refused")
                    }
                  />
                  <Bar
                    dataKey="approuve"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="refuse" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title={t("statistics.fraudsByCategory")}
            sub={t("statistics.fraudsByCategorySub")}
          >
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fraudTypeData}
                    dataKey="value"
                    innerRadius={58}
                    outerRadius={85}
                    paddingAngle={3}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {fraudTypeData.map((e, i) => (
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
                          fontSize: 12,
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {entry.payload.name}
                      </span>
                    )}
                    wrapperStyle={{ paddingTop: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title={t("statistics.amountVsRisk")}
            sub={t("statistics.amountVsRiskSub")}
          >
            <div className="scatter-legend">
              <div className="scatter-legend-item">
                <span
                  className="scatter-legend-dot"
                  style={{ background: "#10b981" }}
                />
                <span className="scatter-legend-label">
                  {t("statistics.legitimate")}
                </span>
              </div>
              <div className="scatter-legend-item">
                <span
                  className="scatter-legend-dot"
                  style={{ background: "#ef4444" }}
                />
                <span className="scatter-legend-label">
                  {t("statistics.fraudulent")}
                </span>
              </div>
            </div>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="montant"
                    name={t("statistics.amount")}
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmt(v)}
                    label={{
                      value: `${t("statistics.amount")} (MAD)`,
                      position: "insideBottom",
                      offset: -14,
                      fontSize: 11,
                      fill: "#94a3b8",
                    }}
                  />
                  <YAxis
                    dataKey="risk_score"
                    name={t("statistics.riskScore")}
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value: t("statistics.riskScore"),
                      angle: -90,
                      position: "insideLeft",
                      offset: 16,
                      fontSize: 11,
                      fill: "#94a3b8",
                    }}
                  />
                  <ZAxis range={[30, 30]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ ...tooltipStyle, padding: "10px 14px" }}>
                          <div
                            style={{
                              fontWeight: 700,
                              marginBottom: 4,
                              color: d.fraud === 1 ? "#ef4444" : "#10b981",
                            }}
                          >
                            {d.fraud === 1
                              ? `🚨 ${t("statistics.fraudulent")}`
                              : `✅ ${t("statistics.legitimate")}`}
                          </div>
                          <div style={{ color: "#374151" }}>
                            {t("statistics.amount")} :{" "}
                            <strong>{fmt(d.montant)} MAD</strong>
                          </div>
                          <div style={{ color: "#374151" }}>
                            {t("statistics.riskScore")} :{" "}
                            <strong>{d.risk_score}</strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={scatterData.filter((d) => d.fraud === 0)}
                    fill="#10b981"
                    fillOpacity={0.5}
                  />
                  <Scatter
                    data={scatterData.filter((d) => d.fraud === 1)}
                    fill="#ef4444"
                    fillOpacity={0.7}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </main>
    </div>
  );
}
