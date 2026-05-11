import { useState, useEffect } from "react";
import {
  Search,
  Clock,
  AlertTriangle,
  Mail,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  User,
  MapPin,
  Smartphone,
  Globe,
  Calendar,
  Activity,
  Send,
  FileText,
  History,
  Ban,
} from "lucide-react";
import "./InvestigationsPage.css";
import { useSocket } from "../hooks/useSocket";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";

export default function InvestigationsPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = useSocket();
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState({});
  const [newNote, setNewNote] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmedCount, setConfirmedCount] = useState(0);

  const fetchData = () => {
    setLoading(true);
    api
      .get("/api/investigations")
      .then((data) => {
        setTransactions(
          data.transactions.filter(
            (t) => t.status === "investigation" || t.statut === "Investigation",
          ),
        );
        setConfirmedCount(data.confirmedCount);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t("investigations.error"));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [t]);

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      [t.id, t.client, t.merchant].some((f) =>
        f?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "critical" && t.riskLevel === "élevé");
    return matchesSearch && matchesStatus;
  });

  const critical = filtered.filter((t) => t.riskLevel === "élevé");
  const waiting = filtered.filter(
    (t) => t.status === "investigation" || t.statut === "Investigation",
  );

  const handleRefuse = async (txn) => {
    if (!window.confirm(t("investigations.confirmRefuse"))) return;
    try {
      await api.post(`/api/transactions/${txn.id}/refuse`, {
        id_user: 1,
        commentaire: "Refusée",
      });
      fetchData();
    } catch (err) {
      alert(err.message || t("investigations.error"));
    }
  };

  const handleResendEmail = async (txn) => {
    try {
      await api.post(`/api/transactions/${txn.id}/investigate`, {
        subject: t("investigations.resendSubject"),
        message: t("investigations.resendMessage", { id: txn.id }),
      });
      alert(t("investigations.resendSuccess"));
    } catch (err) {
      alert(err.message || t("investigations.error"));
    }
  };

  const addNote = (id) => {
    if (!newNote.trim()) return;
    setNotes((prev) => ({
      ...prev,
      [id]: [
        ...(prev[id] || []),
        { text: newNote, date: new Date().toLocaleString("fr-FR") },
      ],
    }));
    setNewNote("");
  };

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const getRiskBadge = (level, score) => {
    const normalized = level?.toLowerCase() || "";
    const score100 = score || 0;
    if (normalized.includes("élev") || normalized.includes("high"))
      return (
        <span className="badge-risk risk-high">
          <ShieldAlert size={14} />
          {t("investigations.critical")} {score100}/100
        </span>
      );
    if (normalized.includes("moyen") || normalized.includes("medium"))
      return (
        <span className="badge-risk risk-medium">
          <Shield size={14} />
          {t("investigations.medium")} {score100}/100
        </span>
      );
    return (
      <span className="badge-risk risk-low">
        <ShieldCheck size={14} />
        {t("investigations.low")} {score100}/100
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("investigation"))
      return (
        <span className="badge-status status-investigating">
          <Clock size={12} />
          {t("investigations.waitingClient")}
        </span>
      );
    return (
      <span className="badge-status status-pending">
        <Clock size={12} />
        {t("investigations.waiting")}
      </span>
    );
  };

  return (
    <div className="investigations-page">
      <div className="page-header-section">
        <div>
          <h1 className="page-title">{t("investigations.title")}</h1>
          <p className="page-subtitle">
            {filtered.length} {t("investigations.subtitle")}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={fetchData}>
            <History size={16} />
            {t("investigations.refresh")}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue">
            <Mail size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value text-blue">{filtered.length}</div>
            <div className="stat-label">{t("investigations.emailsSent")}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-red">
            <ShieldAlert size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value text-red">{critical.length}</div>
            <div className="stat-label">{t("investigations.criticalRisk")}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-amber">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value text-amber">{waiting.length}</div>
            <div className="stat-label">
              {t("investigations.waitingResponse")}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-green">
            <CheckCircle size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value text-green">{confirmedCount}</div>
            <div className="stat-label">
              {t("investigations.confirmedClient")}
            </div>
          </div>
        </div>
      </div>

      <div className="filters-bar-modern">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={t("investigations.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-modern"
          />
        </div>
        <div className="filter-tabs-wrapper">
          <div className="filter-tabs">
            <button
              className={
                filterStatus === "all" ? "filter-tab active" : "filter-tab"
              }
              onClick={() => setFilterStatus("all")}
            >
              {t("investigations.all")}
            </button>
            <button
              className={
                filterStatus === "critical" ? "filter-tab active" : "filter-tab"
              }
              onClick={() => setFilterStatus("critical")}
            >
              {t("investigations.critical")}
            </button>
          </div>
        </div>
      </div>

      <div className="transactions-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>{t("investigations.loading")}</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertTriangle size={32} />
            <p>{error}</p>
            <button onClick={fetchData}>{t("investigations.retry")}</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Mail size={48} />
            <p>{t("investigations.noInvestigations")}</p>
            <span className="empty-sub">
              {t("investigations.noInvestigationsSub")}
            </span>
          </div>
        ) : (
          filtered.map((txn) => {
            const isOpen = expandedId === txn.id;
            const txnNotes = notes[txn.id] || [];
            const isCritical = txn.riskLevel?.toLowerCase().includes("élev");
            return (
              <div
                key={txn.id}
                className={`investigation-card ${isCritical ? "card-critical" : ""} ${isOpen ? "expanded" : ""}`}
              >
                <div
                  className="card-header"
                  onClick={() => toggleExpand(txn.id)}
                >
                  <div className="card-header-left">
                    <div
                      className={`risk-icon ${isCritical ? "bg-red-light" : "bg-blue-light"}`}
                    >
                      {isCritical ? (
                        <AlertTriangle size={20} className="text-red" />
                      ) : (
                        <Mail size={20} className="text-blue" />
                      )}
                    </div>
                    <div className="card-meta">
                      <div className="card-meta-top">
                        <span className="txn-id font-mono">{txn.id}</span>
                        {getStatusBadge(txn.status)}
                        {isCritical && (
                          <span className="badge-risk risk-high">
                            <ShieldAlert size={12} />
                            {t("investigations.critical")} {txn.riskScore}/100
                          </span>
                        )}
                      </div>
                      <div className="client-name">{txn.client}</div>
                      <div className="txn-details">
                        <span className="amount">
                          {txn.amount?.toLocaleString("fr-FR")} EUR
                        </span>
                        <span className="separator">•</span>
                        <span className="merchant">{txn.merchant}</span>
                        <span className="separator">•</span>
                        <span className="location">
                          <MapPin size={12} />
                          {txn.location}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="card-header-right">
                    <div className="txn-date">
                      <Calendar size={14} />
                      {txn.date} {txn.time}
                    </div>
                    <div className="card-actions-preview">
                      <button
                        className="icon-btn danger-hover"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefuse(txn);
                        }}
                        title={t("investigations.refuseTransaction")}
                      >
                        <Ban size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(txn.id);
                        }}
                      >
                        {isOpen ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="card-body">
                    <div className="details-grid">
                      <div className="details-section">
                        <h4 className="section-title">
                          <Activity size={16} />
                          {t("investigations.alertSignals")}
                        </h4>
                        <div className="signals-grid">
                          {txn.flags?.map((flag, i) => (
                            <span key={i} className="signal-tag">
                              <AlertTriangle size={12} />
                              {flag.trim()}
                            </span>
                          )) || (
                            <span className="no-signals">
                              {t("investigations.noSignals")}
                            </span>
                          )}
                        </div>
                        <div className="info-grid">
                          <div className="info-item">
                            <span className="info-label">
                              <Globe size={14} /> IP
                            </span>
                            <span className="info-value font-mono">
                              {txn.ipAddress || "—"}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">
                              <Smartphone size={14} />{" "}
                              {t("investigations.device")}
                            </span>
                            <span className="info-value">
                              {txn.deviceType || t("investigations.unknown")}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">
                              <Mail size={14} /> {t("investigations.email")}
                            </span>
                            <span className="info-value">
                              {txn.email || "—"}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">
                              <User size={14} /> {t("investigations.phone")}
                            </span>
                            <span className="info-value">
                              {txn.phone || "—"}
                            </span>
                          </div>
                        </div>
                        <div className="action-buttons single-action">
                          <button
                            className="btn-danger-full"
                            onClick={() => handleRefuse(txn)}
                          >
                            <Ban size={18} />
                            <div className="btn-content">
                              <span className="btn-label">
                                {t("investigations.refuseTransaction")}
                              </span>
                              <span className="btn-sublabel">
                                {t("investigations.markAsFraud")}
                              </span>
                            </div>
                          </button>
                          <button
                            className="btn-ghost"
                            onClick={() => handleResendEmail(txn)}
                          >
                            <Send size={16} />
                            {t("investigations.resendEmail")}
                          </button>
                        </div>
                      </div>
                      <div className="details-section">
                        <h4 className="section-title">
                          <FileText size={16} />
                          {t("investigations.investigationNotes")}
                          <span className="note-count">{txnNotes.length}</span>
                        </h4>
                        <div className="notes-list">
                          {txnNotes.length === 0 ? (
                            <div className="no-notes">
                              <MessageSquare size={24} />
                              <p>{t("investigations.noNotes")}</p>
                            </div>
                          ) : (
                            txnNotes.map((note, i) => (
                              <div key={i} className="note-item">
                                <div className="note-header">
                                  <span className="note-author">
                                    {t("investigations.agent")}
                                  </span>
                                  <span className="note-date">{note.date}</span>
                                </div>
                                <p className="note-text">{note.text}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="note-input-area">
                          <input
                            type="text"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder={t("investigations.addNotePlaceholder")}
                            className="note-input"
                            onKeyPress={(e) =>
                              e.key === "Enter" && addNote(txn.id)
                            }
                          />
                          <button
                            className="btn-primary-small"
                            onClick={() => addNote(txn.id)}
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
