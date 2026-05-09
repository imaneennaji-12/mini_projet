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
import { io } from "socket.io-client";

import { useAuth } from "../context/AuthContext"; // ← AJOUT
import { api } from "../lib/api"; // ← AJOUT
import RapportCard from "../components/RapportCard";

/* ══ HELPERS ══ */
function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return {};
  }
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  fontFamily: "'DM Mono', monospace",
  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
  background: "#fff",
};

/* ══ ChartCard ══ */
function ChartCard({ title, sub, children }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-sub">{sub}</div>
      {children}
    </div>
  );
}

/* ══ STATISTICS ══ */
export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const { token } = useAuth(); // ← MODIFIÉ : utilise AuthContext au lieu de localStorage direct

  const fraudHourData = stats?.fraudHourData || [];
  const scatterData = stats?.scatterData || [];
  const cityFraudData = stats?.cityFraudData || [];
  const amountByDay = stats?.amountByDay || [];
  const fraudTypeData = stats?.fraudTypeData || [];
  const decisionsByDay = stats?.decisionsByDay || [];

  useEffect(() => {
    if (!token) navigate("/", { replace: true });
  }, [token, navigate]);

  // ─── Chargement initial avec api.js ───
  useEffect(() => {
    if (!token) return;
    api
      .get("/stats/advanced")
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger les statistiques.");
        setLoading(false);
      });
  }, [token]);

  // ─── WebSocket : refresh auto avec api.js ───
  useEffect(() => {
    const socket = io("http://127.0.0.1:5000");
    socket.on("new_transaction", () => {
      api
        .get("/stats/advanced")
        .then((d) => setStats(d))
        .catch(console.error);
    });
    return () => socket.off("new_transaction");
  }, [token]);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="stats-root">
      <main className="main-content">
        {/* Header */}
        <div className="header-row">
          <div>
            <h1 className="header-title">Statistiques & Analyses 📊</h1>
            <p className="header-sub">Tableaux de bord analytiques — {today}</p>
          </div>
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}

        {/* Rapport card — gère son propre PDF */}
        <RapportCard stats={stats} loading={loading} />

        {/* Grille des graphiques */}
        <div className="charts-grid">
          {/* 1 — Fraudes par heure */}
          <ChartCard
            title="Fraudes par heure de la journée"
            sub="Distribution horaire — identifiez les pics d'activité frauduleuse"
          >
            <div id="chart-hour" style={{ width: "100%", height: 240 }}>
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
                    formatter={(v) => [v, "Fraudes"]}
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

          {/* 2 — Montant / jour */}
          <ChartCard
            title="Montant frauduleux / jour"
            sub="Exposition financière journalière (MAD)"
          >
            <div id="chart-day" style={{ width: "100%", height: 240 }}>
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
                    formatter={(v) => [fmt(v) + " MAD", "Montant"]}
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

          {/* 3 — Top villes */}
          <ChartCard
            title="Top villes à risque"
            sub="Nombre de fraudes par ville"
          >
            <div id="chart-city" style={{ width: "100%", height: 240 }}>
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
                    formatter={(v) => [v, "Fraudes"]}
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

          {/* 4 — Décisions humaines */}
          <ChartCard
            title="Décisions humaines / jour"
            sub="Approuvées vs refusées par les analystes"
          >
            <div id="chart-decisions" style={{ width: "100%", height: 240 }}>
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
                      v === "approuve" ? "Approuvées" : "Refusées"
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

          {/* 5 — Donut catégories */}
          <ChartCard
            title="Fraudes par catégorie marchande"
            sub="Répartition selon le type de commerce"
          >
            <div id="chart-category" style={{ width: "100%", height: 260 }}>
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

          {/* 6 — Scatter */}
          <ChartCard
            title="Montant vs Score de risque"
            sub="Corrélation entre montant de transaction et niveau de risque ML"
          >
            <div className="scatter-legend">
              {[
                { color: "#10b981", label: "Transaction légitime" },
                { color: "#ef4444", label: "Transaction frauduleuse" },
              ].map(({ color, label }) => (
                <div key={label} className="scatter-legend-item">
                  <span
                    className="scatter-legend-dot"
                    style={{ background: color }}
                  />
                  <span className="scatter-legend-label">{label}</span>
                </div>
              ))}
            </div>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="montant"
                    name="Montant"
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmt(v)}
                    label={{
                      value: "Montant (MAD)",
                      position: "insideBottom",
                      offset: -14,
                      fontSize: 11,
                      fill: "#94a3b8",
                    }}
                  />
                  <YAxis
                    dataKey="risk_score"
                    name="Risk score"
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value: "Score risque",
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
                            {d.fraud === 1 ? "🚨 Fraude" : "✅ Légitime"}
                          </div>
                          <div style={{ color: "#374151" }}>
                            Montant : <strong>{fmt(d.montant)} MAD</strong>
                          </div>
                          <div style={{ color: "#374151" }}>
                            Risk score : <strong>{d.risk_score}</strong>
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
