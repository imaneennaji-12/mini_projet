import {
  Download,
  BarChart2,
  ShieldAlert,
  DollarSign,
  Activity,
  Users,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import React, { useState } from "react";
/* ══ HELPERS ══ */
function fmt(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

/* ══ PDF ENGINE ══ */
export async function generatePDF(stats) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const M = 14; // margin
  const CW = pageW - M * 2; // content width
  let y = M;

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  /* ── utilitaires ── */
  const newPage = () => {
    pdf.addPage();
    y = M;
  };

  const checkPage = (needed) => {
    if (y + needed > pageH - M - 10) newPage();
  };

  const setFont = (size, style = "normal", color = [30, 41, 59]) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", style);
    pdf.setTextColor(...color);
  };

  const addWrapped = (text, size = 9, color = [71, 85, 105], extraY = 3) => {
    setFont(size, "normal", color);
    const lines = pdf.splitTextToSize(text, CW);
    lines.forEach((l) => {
      checkPage(size * 0.5 + 2);
      pdf.text(l, M, y);
      y += size * 0.42;
    });
    y += extraY;
  };

  const addRule = (color = [226, 232, 240]) => {
    checkPage(8);
    pdf.setDrawColor(...color);
    pdf.setLineWidth(0.25);
    pdf.line(M, y, pageW - M, y);
    y += 6;
  };

  const addSectionBadge = (text) => {
    checkPage(18);
    y += 3;
    pdf.setFillColor(15, 23, 42);
    pdf.roundedRect(M, y - 3, CW, 11, 2, 2, "F");
    setFont(8, "bold", [148, 163, 184]);
    pdf.text(text.toUpperCase(), M + 5, y + 4.5);
    y += 14;
  };

  /* ── KPI row (4 cards) ── */
  const addKpiRow = (kpis) => {
    checkPage(24);
    const colW = CW / kpis.length;
    kpis.forEach(({ label, value, sub, color }, i) => {
      const x = M + i * colW;
      const rgb = color || [59, 130, 246];
      // card bg
      pdf.setFillColor(250, 251, 253);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.25);
      pdf.roundedRect(x + 1, y, colW - 2, 20, 2, 2, "FD");
      // accent bar
      pdf.setFillColor(...rgb);
      pdf.roundedRect(x + 1, y, 3, 20, 1, 1, "F");
      // label
      setFont(7, "normal", [100, 116, 139]);
      pdf.text(label, x + 7, y + 6);
      // value
      setFont(12, "bold", [15, 23, 42]);
      pdf.text(String(value), x + 7, y + 13.5);
      // sub
      if (sub) {
        setFont(6.5, "normal", [148, 163, 184]);
        pdf.text(sub, x + 7, y + 18.5);
      }
    });
    y += 24;
  };

  /* ── Chart snapshot ── */
  const addChart = async (id, title, desc) => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn("introuvable:", id);
      return;
    }
    await new Promise((r) => setTimeout(r, 200));

    // measure rendered height → estimate mm
    const elH = el.getBoundingClientRect().height;
    const imgHmm = Math.min((elH * CW) / el.getBoundingClientRect().width, 80);
    const needed = imgHmm + (desc ? 18 : 12);

    checkPage(needed);

    // title
    setFont(9, "bold", [15, 23, 42]);
    pdf.text(title, M, y);
    y += 5;
    // desc
    if (desc) {
      addWrapped(desc, 8, [100, 116, 139], 2);
    }
    // capture
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const imgH = (canvas.height * CW) / canvas.width;
    checkPage(imgH + 4);
    pdf.addImage(imgData, "PNG", M, y, CW, imgH);
    y += imgH + 8;
  };

  /* ════════════════════════════════════
     PAGE 1 — COUVERTURE + KPIs
  ════════════════════════════════════ */

  // Header banner
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(M, y, CW, 32, 3, 3, "F");
  // accent stripe
  pdf.setFillColor(59, 130, 246);
  pdf.roundedRect(M, y, 4, 32, 2, 2, "F");

  setFont(15, "bold", [255, 255, 255]);
  pdf.text("Rapport de Détection de Fraude", M + 10, y + 12);
  setFont(8.5, "normal", [148, 163, 184]);
  pdf.text(
    "Système de surveillance anti-fraude — Analyse hebdomadaire",
    M + 10,
    y + 20,
  );
  setFont(7.5, "normal", [100, 116, 139]);
  pdf.text(dateStr, pageW - M - pdf.getTextWidth(dateStr), y + 12);
  setFont(6.5, "bold", [239, 68, 68]);
  pdf.text(
    "CONFIDENTIEL",
    pageW - M - pdf.getTextWidth("CONFIDENTIEL"),
    y + 20,
  );
  y += 38;

  // Intro

  // KPIs section
  addSectionBadge("1. Indicateurs clés de performance");
  addKpiRow([
    {
      label: "Fraudes détectées",
      value: stats?.fraudDetected ?? "—",
      sub: "transactions",
      color: [239, 68, 68],
    },
    {
      label: "Montant risqué",
      value:
        (stats?.riskAmount >= 1000
          ? (stats.riskAmount / 1000).toFixed(1) + "K"
          : (stats?.riskAmount ?? "—")) + " MAD",
      sub: "exposés",
      color: [245, 158, 11],
    },
    {
      label: "Taux de validation",
      value: stats ? `${stats.validationRate}%` : "—",
      sub: "légitimes",
      color: [16, 185, 129],
    },
    {
      label: "Transactions totales",
      value: stats?.totalTransactions?.toLocaleString("fr-FR") ?? "—",
      sub: "analysées",
      color: [59, 130, 246],
    },
  ]);
  y += 2;
  addKpiRow([
    {
      label: "Score risque moyen",
      value: stats?.avgRiskScore ?? "—",
      sub: "sur 100",
      color: [139, 92, 246],
    },
    {
      label: "Taux de refus",
      value: stats ? `${stats.refusalRate}%` : "—",
      sub: "refusées",
      color: [245, 158, 11],
    },
    {
      label: "Investigations",
      value: stats?.openInvestigations ?? "—",
      sub: "en attente",
      color: [59, 130, 246],
    },
    {
      label: "Alertes générées",
      value: stats?.totalAlerts ?? "—",
      sub: "toutes priorités",
      color: [239, 68, 68],
    },
  ]);
  addRule();

  // Analyse textuelle
  addSectionBadge("2. Analyse de la période");
  addWrapped(
    `Sur la période analysée, ${stats?.totalTransactions?.toLocaleString("fr-FR") ?? "—"} transactions ont été traitées. ` +
      `Parmi celles-ci, ${stats?.fraudDetected ?? "—"} ont été identifiées comme frauduleuses, représentant un taux de fraude ` +
      `de ${stats ? (100 - stats.validationRate).toFixed(2) : "—"}%. Le montant total exposé s'élève à ${stats?.riskAmount?.toLocaleString("fr-FR") ?? "—"} MAD.`,
    8.5,
    [71, 85, 105],
  );
  addWrapped(
    `Le score de risque moyen des transactions est de ${stats?.avgRiskScore ?? "—"}/100. ` +
      `${stats?.openInvestigations ?? "—"} investigations restent ouvertes et nécessitent une intervention humaine.`,
    8.5,
    [71, 85, 105],
  );

  /* ════════════════════════════════════
     PAGES 2+ — GRAPHIQUES (auto-flow)
  ════════════════════════════════════ */
  newPage();
  addSectionBadge("3. Visualisation des données");

  await addChart(
    "chart-hour",
    "3.1 Distribution des fraudes par heure",
    "Identifie les créneaux horaires à plus haute fréquence de fraude.",
  );
  await addChart(
    "chart-day",
    "3.2 Évolution du montant frauduleux par jour",
    "Permet de détecter une aggravation ou amélioration au fil de la semaine.",
  );
  await addChart(
    "chart-city",
    "3.3 Répartition géographique des fraudes",
    "Identification des villes les plus exposées pour orienter les contrôles.",
  );
  await addChart(
    "chart-decisions",
    "3.4 Décisions humaines — Approuvées vs Refusées",
    "Suivi quotidien des décisions prises par les analystes.",
  );
  await addChart(
    "chart-category",
    "3.5 Fraudes par catégorie marchande",
    "Répartition des fraudes selon le secteur marchand.",
  );

  /* ════════════════════════════════════
     CONCLUSION
  ════════════════════════════════════ */
  checkPage(60);
  addRule();
  addSectionBadge("4. Conclusion & Recommandations");
  addWrapped(
    "Sur la base des données analysées, plusieurs axes d'amélioration sont identifiés :",
    8.5,
    [71, 85, 105],
    2,
  );

  const recs = [
    "Renforcer les contrôles durant les créneaux horaires à forte activité frauduleuse.",
    "Surveiller en priorité les villes et catégories marchandes à risque élevé.",
    "Réduire le délai de traitement des investigations ouvertes pour limiter l'exposition.",
    "Affiner les seuils du modèle ML pour les catégories présentant un score de risque moyen élevé.",
  ];
  recs.forEach((r, i) => {
    checkPage(10);
    // bullet dot
    pdf.setFillColor(59, 130, 246);
    pdf.circle(M + 2, y - 1, 1, "F");
    setFont(8.5, "normal", [71, 85, 105]);
    const lines = pdf.splitTextToSize(r, CW - 8);
    lines.forEach((l, li) => {
      pdf.text(l, M + 6, y + li * 4.5);
    });
    y += lines.length * 4.5 + 3;
  });

  /* ════════════════════════════════════
     FOOTER sur chaque page
  ════════════════════════════════════ */
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    // footer bar
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, pageH - 12, pageW, 12, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.25);
    pdf.line(0, pageH - 12, pageW, pageH - 12);
    setFont(7, "normal", [148, 163, 184]);
    pdf.text(
      "Document confidentiel — usage interne uniquement | AnalyseTransaction IA",
      M,
      pageH - 5,
    );
    pdf.text(
      `Page ${i} / ${totalPages}`,
      pageW - M - pdf.getTextWidth(`Page ${i} / ${totalPages}`),
      pageH - 5,
    );
  }

  pdf.save(
    `rapport-fraude-${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`,
  );
}

/* ══ COMPOSANT UI ══ */
export default function RapportCard({ stats, loading }) {
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const [pdfLoading, setPdfLoading] = React.useState(false);

  const handleDownload = async () => {
    setPdfLoading(true);
    try {
      await generatePDF(stats);
    } catch (e) {
      console.error("PDF error:", e);
      alert("Erreur : " + e.message);
    }
    setPdfLoading(false);
  };

  const kpis = [
    {
      icon: ShieldAlert,
      label: "Fraudes détectées",
      value: stats?.fraudDetected ?? "—",
      color: "#ef4444",
    },
    {
      icon: DollarSign,
      label: "Montant risqué",
      value: stats ? fmt(stats.riskAmount) + " MAD" : "—",
      color: "#f59e0b",
    },
    {
      icon: Activity,
      label: "Transactions",
      value: stats?.totalTransactions?.toLocaleString("fr-FR") ?? "—",
      color: "#3b82f6",
    },
    {
      icon: Users,
      label: "Investigations",
      value: stats?.openInvestigations ?? "—",
      color: "#8b5cf6",
    },
    {
      icon: CheckCircle2,
      label: "Taux validation",
      value: stats ? `${stats.validationRate}%` : "—",
      color: "#10b981",
    },
    {
      icon: AlertTriangle,
      label: "Score risque moy",
      value: stats?.avgRiskScore ?? "—",
      color: "#f59e0b",
    },
  ];

  return (
    <div className="rapport-card">
      <div className="rapport-left">
        <div className="rapport-header">
          <div className="rapport-icon-wrap">
            <BarChart2 size={18} color="#93c5fd" />
          </div>
          <div>
            <div className="rapport-tag">Rapport hebdomadaire</div>
            <div className="rapport-date">{today}</div>
          </div>
        </div>
        <div className="rapport-title">
          Synthèse de la
          <br />
          détection de fraude
        </div>
        <div className="rapport-desc">
          Vue consolidée de l'activité de surveillance — transactions analysées,
          fraudes détectées, décisions humaines et exposition financière.
        </div>
        <button
          className="pdf-btn"
          onClick={handleDownload}
          disabled={pdfLoading || loading}
        >
          <Download size={13} />
          {pdfLoading ? "Génération..." : "Télécharger PDF"}
        </button>
      </div>
      <div className="rapport-kpis">
        {kpis.map(({ icon: Icon, label, value, color }) => (
          <div className="kpi-item" key={label}>
            <div className="kpi-icon-wrap" style={{ background: color + "22" }}>
              <Icon size={14} color={color} />
            </div>
            <div className="kpi-text">
              <div className="kpi-label">{label}</div>
              <div className="kpi-value">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
