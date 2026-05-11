import React, { useEffect, useMemo, useState } from "react";
import "./TransactionsPage.css";
import { useSocket } from "../hooks/useSocket";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";

export default function TransactionsPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const { socketRef, connected } = useSocket();
  const [filteredStatus, setFilteredStatus] = useState("all");
  const [filteredRisk, setFilteredRisk] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInvestigationForm, setShowInvestigationForm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [investigationForm, setInvestigationForm] = useState({
    to: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    api
      .get("/api/transactions")
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t("transactions.error"));
        setLoading(false);
      });
  }, [t]);

  useEffect(() => {
    if (!connected) return;
    const socket = socketRef.current;
    if (!socket) return;
    const handleNew = (data) => {
      if (!data || !data.id_transaction) return;
      setTransactions((prev) =>
        prev.find((x) => x.id_transaction === data.id_transaction)
          ? prev
          : [data, ...prev],
      );
    };
    const handleUpdate = (data) => {
      setTransactions((prev) =>
        prev.map((x) =>
          x.id_transaction === data.id_transaction
            ? { ...x, statut: data.statut }
            : x,
        ),
      );
    };
    socket.on("new_transaction", handleNew);
    socket.on("transaction_updated", handleUpdate);
    return () => {
      socket.off("new_transaction", handleNew);
      socket.off("transaction_updated", handleUpdate);
    };
  }, [connected]);

  const normalizeStatus = (statut) => {
    if (!statut) return "pending";
    const s = statut.toLowerCase();
    if (s.includes("invest")) return "investigating";
    if (s.includes("valid")) return "validated";
    if (s.includes("refus")) return "refused";
    if (s.includes("trait")) return "treated";
    return "pending";
  };

  const normalizeRisk = (risk) => {
    if (!risk) return "medium";
    const r = risk.toLowerCase();
    if (r.includes("élev") || r.includes("eleve") || r.includes("high"))
      return "high";
    if (r.includes("faibl") || r.includes("low")) return "low";
    return "medium";
  };

  const formatDate = (value) => {
    if (!value) return { date: "-", time: "-" };
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      const parts = String(value).split(" ");
      return { date: parts[0] || "-", time: parts[1] || "-" };
    }
    return {
      date: d.toLocaleDateString("fr-FR"),
      time: d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  };

  const getEffectiveStatus = (transaction) => {
    const status = normalizeStatus(transaction.statut);
    const risk = normalizeRisk(transaction.risk_level);
    if (status === "pending" && risk === "low") return "validated";
    return status;
  };

  const counts = useMemo(() => {
    const statuses = transactions.map((t) => getEffectiveStatus(t));
    return {
      all: transactions.length,
      pending: statuses.filter((s) => s === "pending").length,
      investigating: statuses.filter((s) => s === "investigating").length,
      refused: statuses.filter((s) => s === "refused").length,
      validated: statuses.filter((s) => s === "validated").length,
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        String(t.id_transaction || "")
          .toLowerCase()
          .includes(searchValue) ||
        (t.client_nom || "").toLowerCase().includes(searchValue) ||
        (t.city || "").toLowerCase().includes(searchValue) ||
        (t.country || "").toLowerCase().includes(searchValue) ||
        (t.merchant_category || "").toLowerCase().includes(searchValue);
      const matchesStatus =
        filteredStatus === "all" || getEffectiveStatus(t) === filteredStatus;
      const matchesRisk =
        filteredRisk === "all" || normalizeRisk(t.risk_level) === filteredRisk;
      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [transactions, search, filteredStatus, filteredRisk]);

  const riskBadge = (riskLevel, score) => {
    const normalized = normalizeRisk(riskLevel);
    let cls = "risk-medium";
    let label = t("transactions.medium");
    if (normalized === "high") {
      cls = "risk-high";
      label = t("transactions.high");
    } else if (normalized === "low") {
      cls = "risk-low";
      label = t("transactions.low");
    }
    const score100 = score != null ? Math.round(score * 100) : 0;
    return (
      <span className={`badge badge-risk ${cls}`}>
        {score100}/100 {label}
      </span>
    );
  };

  const statusBadge = (transaction) => {
    const normalized = getEffectiveStatus(transaction);
    const map = {
      pending: {
        label: t("transactions.statusPending"),
        cls: "status-pending",
      },
      investigating: {
        label: t("transactions.statusInvestigating"),
        cls: "status-investigating",
      },
      validated: {
        label: t("transactions.statusValidated"),
        cls: "status-validated",
      },
      refused: {
        label: t("transactions.statusRefused"),
        cls: "status-refused",
      },
      treated: {
        label: t("transactions.statusTreated"),
        cls: "status-treated",
      },
    };
    const current = map[normalized] || map.pending;
    return (
      <span className={`badge badge-status ${current.cls}`}>
        {current.label}
      </span>
    );
  };

  const handleInvestigate = (transaction) => {
    const subject = `Confirmation de transaction suspecte - ${transaction.id_transaction}`;
    const message = `Nous avons détecté une transaction suspecte sur votre compte.\nRéférence : ${transaction.id_transaction}\nMontant : ${transaction.montant} EUR\nCatégorie : ${transaction.merchant_category}\nLocalisation : ${transaction.city}, ${transaction.country}\nDate : ${transaction.date_transaction}\n\nMerci de confirmer si cette transaction a bien été effectuée par vous.`;
    setSelectedTransaction(transaction);
    setInvestigationForm({
      to: transaction.client_email || "",
      subject,
      message,
    });
    setShowInvestigationForm(true);
  };

  const handleSendInvestigation = async () => {
    try {
      await api.post(
        `/api/transactions/${selectedTransaction.id_transaction}/investigate`,
        {
          subject: investigationForm.subject,
          message: investigationForm.message,
        },
      );
      setTransactions((prev) =>
        prev.map((x) =>
          x.id_transaction === selectedTransaction.id_transaction
            ? { ...x, statut: "Investigation" }
            : x,
        ),
      );
      setShowInvestigationForm(false);
      setSelectedTransaction(null);
      alert(t("transactions.sendEmail"));
    } catch (error) {
      alert(error.message || t("transactions.error"));
    }
  };

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const handleValidate = async (transaction) => {
    try {
      await api.post(
        `/api/transactions/${transaction.id_transaction}/validate`,
        { id_user: 1, commentaire: "Transaction validée par l'agent" },
      );
      const data = await api.get("/api/transactions");
      setTransactions(data);
    } catch (error) {
      alert(error.message || t("transactions.error"));
    }
  };

  const handleRefuse = async (transaction) => {
    try {
      await api.post(`/api/transactions/${transaction.id_transaction}/refuse`, {
        id_user: 1,
        commentaire: "Transaction refusée par l'agent",
      });
      setTransactions((prev) =>
        prev.map((x) =>
          x.id_transaction === transaction.id_transaction
            ? { ...x, statut: "Refusée" }
            : x,
        ),
      );
    } catch (error) {
      alert(error.message || t("transactions.error"));
    }
  };

  const renderActions = (transaction) => {
    const status = normalizeStatus(transaction.statut);
    const risk = normalizeRisk(transaction.risk_level);
    const isExpanded = expandedId === transaction.id_transaction;
    if (
      status === "validated" ||
      status === "refused" ||
      status === "treated"
    ) {
      return (
        <div className="action-group" onClick={(e) => e.stopPropagation()}>
          <span className="treated-text">{t("transactions.treated")}</span>
          <button
            className="expand-btn"
            type="button"
            onClick={() => toggleExpand(transaction.id_transaction)}
          >
            {isExpanded ? "▴" : "▾"}
          </button>
        </div>
      );
    }
    if (status === "pending" && risk === "low") {
      return (
        <div className="action-group" onClick={(e) => e.stopPropagation()}>
          <span className="treated-text">
            {t("transactions.autoValidated")}
          </span>
          <button
            className="expand-btn"
            type="button"
            onClick={() => toggleExpand(transaction.id_transaction)}
          >
            {isExpanded ? "▴" : "▾"}
          </button>
        </div>
      );
    }
    return (
      <div className="action-group" onClick={(e) => e.stopPropagation()}>
        <button
          className="action-btn success-btn"
          type="button"
          onClick={() => handleValidate(transaction)}
        >
          ✓ {t("transactions.validate")}
        </button>
        <button
          className="action-btn danger-btn"
          type="button"
          onClick={() => handleRefuse(transaction)}
        >
          ✕ {t("transactions.refuse")}
        </button>
        {status === "pending" && (
          <button
            className="action-btn info-btn"
            type="button"
            onClick={() => handleInvestigate(transaction)}
          >
            👁 {t("transactions.investigate")}
          </button>
        )}
        {status === "investigating" && (
          <button
            className="action-btn info-btn"
            type="button"
            onClick={() => {}}
          >
            ✉ {t("transactions.email")}
          </button>
        )}
        <button
          className="expand-btn"
          type="button"
          onClick={() => toggleExpand(transaction.id_transaction)}
        >
          {isExpanded ? "▴" : "▾"}
        </button>
      </div>
    );
  };

  if (loading)
    return <p className="page-message">{t("transactions.loading")}</p>;
  if (error) return <p className="page-message error-message">{error}</p>;

  return (
    <div className="transactions-page">
      <div className="page-header">
        <h1>{t("transactions.title")}</h1>
        <p>{t("transactions.subtitle")}</p>
      </div>

      <div className="quick-filters">
        {[
          { key: "all", label: t("transactions.all") },
          { key: "pending", label: t("transactions.pending") },
          { key: "investigating", label: t("transactions.investigating") },
          { key: "refused", label: t("transactions.refused") },
          { key: "validated", label: t("transactions.validated") },
        ].map((f) => (
          <button
            key={f.key}
            className={
              filteredStatus === f.key ? "filter-tab active" : "filter-tab"
            }
            onClick={() => setFilteredStatus(f.key)}
          >
            {f.label} <span>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder={t("transactions.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="risk-filters">
          <span>{t("transactions.risk")} :</span>
          {[
            { key: "all", label: t("transactions.allRisks") },
            { key: "high", label: t("transactions.high") },
            { key: "medium", label: t("transactions.medium") },
            { key: "low", label: t("transactions.low") },
          ].map((f) => (
            <button
              key={f.key}
              className={
                filteredRisk === f.key
                  ? `risk-filter ${f.key} active`
                  : "risk-filter"
              }
              onClick={() => setFilteredRisk(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="result-count">
          {filteredTransactions.length} {t("transactions.results")}
          {filteredTransactions.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>{t("transactions.id")}</th>
                <th>{t("transactions.client")}</th>
                <th>{t("transactions.amount")}</th>
                <th>{t("transactions.dateTime")}</th>
                <th>{t("transactions.location")}</th>
                <th>{t("transactions.risk")}</th>
                <th>{t("transactions.status")}</th>
                <th>{t("transactions.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => {
                  const formatted = formatDate(t.date_transaction);
                  const isExpanded = expandedId === t.id_transaction;
                  const isHighPending =
                    normalizeRisk(t.risk_level) === "high" &&
                    normalizeStatus(t.statut) === "pending";
                  return (
                    <React.Fragment key={t.id_transaction}>
                      <tr
                        className={`table-row ${isHighPending ? "table-row-alert" : ""}`}
                        onClick={() => toggleExpand(t.id_transaction)}
                      >
                        <td>
                          <div className="id-cell">
                            {isHighPending && (
                              <span className="alert-dot"></span>
                            )}
                            <span className="mono-text">
                              {t.id_transaction}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="client-name">
                            {t.client_nom || t("transactions.noResults")}
                          </div>
                          <div className="sub-text">
                            {t.merchant_category || "-"}
                          </div>
                        </td>
                        <td>
                          <span className="amount-text">
                            {Number(t.montant || 0).toLocaleString("fr-FR")} €
                          </span>
                        </td>
                        <td>
                          <div className="sub-text">{formatted.date}</div>
                          <div className="mono-text small">
                            {formatted.time}
                          </div>
                        </td>
                        <td>
                          <div className="sub-text">
                            {t.city || "-"}, {t.country || "-"}
                          </div>
                        </td>
                        <td>{riskBadge(t.risk_level, t.risk_score)}</td>
                        <td>{statusBadge(t)}</td>
                        <td>{renderActions(t)}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="expanded-row">
                          <td colSpan="8">
                            <div className="expanded-content">
                              <div className="expanded-grid">
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.id")}
                                  </div>
                                  <div>{t.id_transaction || "-"}</div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.category")}
                                  </div>
                                  <div>{t.merchant_category || "-"}</div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.clientEmail")}
                                  </div>
                                  <div>{t.client_email || "-"}</div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.phone")}
                                  </div>
                                  <div>{t.client_telephone || "-"}</div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.modelPrediction")}
                                  </div>
                                  <div>
                                    {t.prediction === 1
                                      ? t("transactions.fraud")
                                      : t("transactions.normal")}
                                  </div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.transactionHour")}
                                  </div>
                                  <div>{t.transaction_hour ?? "-"}</div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.device")}
                                  </div>
                                  <div>
                                    {t.device_trust_score >= 0.5
                                      ? t("transactions.knownDevice")
                                      : t("transactions.unknownDevice")}
                                  </div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.deviceTrustScore")}
                                  </div>
                                  <div>{t.device_trust_score ?? "-"}</div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.velocity24h")}
                                  </div>
                                  <div>{t.velocity_last_24h ?? "-"}</div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.cardholderAge")}
                                  </div>
                                  <div>{t.cardholder_age ?? "-"}</div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.foreignTransaction")}
                                  </div>
                                  <div>
                                    {t.foreign_transaction === 1
                                      ? t("transactions.yes")
                                      : t("transactions.no")}
                                  </div>
                                </div>
                                <div>
                                  <div className="expanded-label">
                                    {t("transactions.locationMismatch")}
                                  </div>
                                  <div>
                                    {t.location_mismatch === 1
                                      ? t("transactions.yes")
                                      : t("transactions.no")}
                                  </div>
                                </div>
                              </div>
                              <div className="signals-block">
                                <div className="expanded-label">
                                  {t("transactions.alertSignals")}
                                </div>
                                <div className="signals-list">
                                  {t.alert_signals ? (
                                    t.alert_signals.split(",").map((s, i) => (
                                      <span key={i} className="signal-badge">
                                        {s.trim()}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="no-signal">
                                      {t("transactions.noSignal")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    {t("transactions.noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInvestigationForm && (
        <div className="email-modal-overlay">
          <div className="email-modal-card">
            <div className="email-modal-header">
              <div className="email-modal-title">
                <div className="email-icon">⚠</div>
                <div>
                  <h2>{t("transactions.emailSubject")}</h2>
                  <p>
                    {t("transactions.emailTo")} : {investigationForm.to}
                  </p>
                </div>
              </div>
              <button
                className="email-close-btn"
                onClick={() => setShowInvestigationForm(false)}
              >
                ×
              </button>
            </div>
            <div className="email-preview-info">
              <div>
                <span>{t("transactions.emailFrom")} :</span>
                <strong>AnalyseTransaction_IA@banque.com</strong>
              </div>
              <div>
                <span>{t("transactions.emailTo")} :</span>
                <strong>{investigationForm.to}</strong>
              </div>
              <div>
                <span>{t("transactions.emailSubject")} :</span>
                <strong>{investigationForm.subject}</strong>
              </div>
            </div>
            <div className="email-message-box">
              <textarea
                value={investigationForm.message}
                onChange={(e) =>
                  setInvestigationForm({
                    ...investigationForm,
                    message: e.target.value,
                  })
                }
              />
            </div>
            <div className="email-info-box">
              ✉ <span>{t("transactions.emailInfo")}</span>
            </div>
            <div className="email-modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowInvestigationForm(false)}
              >
                {t("transactions.cancel")}
              </button>
              <button className="send-btn" onClick={handleSendInvestigation}>
                ✈ {t("transactions.sendEmail")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
