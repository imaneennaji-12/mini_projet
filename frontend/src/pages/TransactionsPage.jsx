import React, { useEffect, useMemo, useState } from "react";
import "./TransactionsPage.css";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [filteredStatus, setFilteredStatus] = useState("all");
  const [filteredRisk, setFilteredRisk] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/transactions")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des transactions");
        }
        return response.json();
      })
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  /** Normalisation des statuts pour gérer les variations de text*/
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
      return {
        date: parts[0] || "-",
        time: parts[1] || "-",
      };
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
  /** Logique pour traiter les statuts "pending" avec risque "low" comme "validated" */
  const getEffectiveStatus = (transaction) => {
    const status = normalizeStatus(transaction.statut);
    const risk = normalizeRisk(transaction.risk_level);

    if (status === "pending" && risk === "low") return "validated";

    return status;
  };
  /** Calcul des comptes pour les filtres rapides */
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
  /** Logique de filtrage combiné pour recherche, statut et risque */
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
      const statusValue = getEffectiveStatus(t);
      const riskValue = normalizeRisk(t.risk_level);

      const matchesStatus =
        filteredStatus === "all" || statusValue === filteredStatus;

      const matchesRisk = filteredRisk === "all" || riskValue === filteredRisk;

      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [transactions, search, filteredStatus, filteredRisk]);

  const riskBadge = (riskLevel, score) => {
    const normalized = normalizeRisk(riskLevel);

    let cls = "risk-medium";
    let label = "Moyen";

    if (normalized === "high") {
      cls = "risk-high";
      label = "Élevé";
    } else if (normalized === "low") {
      cls = "risk-low";
      label = "Faible";
    }

    return (
      <span className={`badge badge-risk ${cls}`}>
        {score ?? 0}/100 {label}
      </span>
    );
  };

  const statusBadge = (transaction) => {
    const normalized = getEffectiveStatus(transaction);

    const map = {
      pending: { label: "En attente", cls: "status-pending" },
      investigating: { label: "Investigation", cls: "status-investigating" },
      validated: { label: "Validée", cls: "status-validated" },
      refused: { label: "Refusée", cls: "status-refused" },
      treated: { label: "Traitée", cls: "status-treated" },
    };

    const current = map[normalized] || map.pending;
    return (
      <span className={`badge badge-status ${current.cls}`}>
        {current.label}
      </span>
    );
  };

  const handleInvestigate = (transaction) => {
    console.log("Investiguer :", transaction);
  };

  const handleEmail = (transaction) => {
    console.log("Email :", transaction);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };
  const handleValidate = async (transaction) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/transactions/${transaction.id_transaction}/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id_user: 1,
            commentaire: "Transaction validée par l'agent",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la validation");
      }

      setTransactions((prev) =>
        prev.map((t) =>
          t.id_transaction === transaction.id_transaction
            ? { ...t, statut: "Validée" }
            : t,
        ),
      );

      console.log(data);
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  };
  const handleRefuse = async (transaction) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/transactions/${transaction.id_transaction}/refuse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id_user: 1,
            commentaire: "Transaction refusée par l'agent",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du refus");
      }

      setTransactions((prev) =>
        prev.map((t) =>
          t.id_transaction === transaction.id_transaction
            ? { ...t, statut: "Refusée" }
            : t,
        ),
      );

      console.log(data);
    } catch (error) {
      console.error(error.message);
      alert(error.message);
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
          <span className="treated-text">Traitée</span>
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
          <span className="treated-text">validée automatiquement</span>
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
          ✓ Valider
        </button>

        <button
          className="action-btn danger-btn"
          type="button"
          onClick={() => handleRefuse(transaction)}
        >
          ✕ Refuser
        </button>

        {status === "pending" && (
          <button
            className="action-btn info-btn"
            type="button"
            onClick={() => handleInvestigate(transaction)}
          >
            👁 Investiguer
          </button>
        )}

        {status === "investigating" && (
          <button
            className="action-btn info-btn"
            type="button"
            onClick={() => handleEmail(transaction)}
          >
            ✉ Email
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

  if (loading) return <p className="page-message">Chargement...</p>;
  if (error) return <p className="page-message error-message">{error}</p>;

  return (
    <div className="transactions-page">
      {/* En-tête de la page avec titre et description */}
      <div className="page-header">
        <h1>Transactions suspectes</h1>
        <p>Gérez et analysez les transactions signalées par le système</p>
      </div>
      {/* Filtres rapides par statut avec compteurs */}
      <div className="quick-filters">
        <button
          className={
            filteredStatus === "all" ? "filter-tab active" : "filter-tab"
          }
          onClick={() => setFilteredStatus("all")}
        >
          Toutes <span>{counts.all}</span>
        </button>

        <button
          className={
            filteredStatus === "pending" ? "filter-tab active" : "filter-tab"
          }
          onClick={() => setFilteredStatus("pending")}
        >
          En attente <span>{counts.pending}</span>
        </button>

        <button
          className={
            filteredStatus === "investigating"
              ? "filter-tab active"
              : "filter-tab"
          }
          onClick={() => setFilteredStatus("investigating")}
        >
          Investigation <span>{counts.investigating}</span>
        </button>

        <button
          className={
            filteredStatus === "refused" ? "filter-tab active" : "filter-tab"
          }
          onClick={() => setFilteredStatus("refused")}
        >
          Refusées <span>{counts.refused}</span>
        </button>

        <button
          className={
            filteredStatus === "validated" ? "filter-tab active" : "filter-tab"
          }
          onClick={() => setFilteredStatus("validated")}
        >
          Validées <span>{counts.validated}</span>
        </button>
      </div>
      {/* Barre de recherche et filtres de risque */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Rechercher par ID, client, ville, pays..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <div className="risk-filters">
          <span>Risque :</span>

          <button
            className={
              filteredRisk === "all" ? "risk-filter active" : "risk-filter"
            }
            onClick={() => setFilteredRisk("all")}
          >
            Tous
          </button>

          <button
            className={
              filteredRisk === "high"
                ? "risk-filter high active"
                : "risk-filter"
            }
            onClick={() => setFilteredRisk("high")}
          >
            Élevé
          </button>

          <button
            className={
              filteredRisk === "medium"
                ? "risk-filter medium active"
                : "risk-filter"
            }
            onClick={() => setFilteredRisk("medium")}
          >
            Moyen
          </button>

          <button
            className={
              filteredRisk === "low" ? "risk-filter low active" : "risk-filter"
            }
            onClick={() => setFilteredRisk("low")}
          >
            Faible
          </button>
        </div>

        <div className="result-count">
          {filteredTransactions.length} résultat
          {filteredTransactions.length > 1 ? "s" : ""}
        </div>
      </div>
      {/* Tableau des transactions avec logique d'expansion pour détails */}
      <div className="table-card">
        <div className="table-scroll">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Montant</th>
                <th>Date / Heure</th>
                <th>Localisation</th>
                <th>Risque</th>
                <th>Statut</th>
                <th>Actions</th>
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
                            {t.client_nom || "Client inconnu"}
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
                                    ID transaction
                                  </div>
                                  <div>{t.id_transaction || "-"}</div>
                                </div>

                                <div>
                                  <div className="expanded-label">
                                    Catégorie
                                  </div>
                                  <div>{t.merchant_category || "-"}</div>
                                </div>

                                <div>
                                  <div className="expanded-label">
                                    Email client
                                  </div>
                                  <div>{t.client_email || "-"}</div>
                                </div>

                                <div>
                                  <div className="expanded-label">
                                    Téléphone
                                  </div>
                                  <div>{t.client_telephone || "-"}</div>
                                </div>

                                <div>
                                  <div className="expanded-label">
                                    Prédiction modèle
                                  </div>
                                  <div>
                                    {t.prediction === 1 ? "Fraude" : "Normale"}
                                  </div>
                                </div>

                                <div>
                                  <div className="expanded-label">
                                    Heure transaction
                                  </div>
                                  <div>{t.transaction_hour ?? "-"}</div>
                                </div>

                                <div>
                                  <div className="expanded-label">Appareil</div>
                                  <div>
                                    {t.device_trust_score >= 0.5
                                      ? "Appareil connu"
                                      : "Appareil inconnu"}
                                  </div>
                                </div>

                                <div>
                                  <div className="expanded-label">
                                    Score confiance appareil
                                  </div>
                                  <div>{t.device_trust_score ?? "-"}</div>
                                </div>

                                <div>
                                  <div className="expanded-label">
                                    Vélocité 24h
                                  </div>
                                  <div>{t.velocity_last_24h ?? "-"}</div>
                                </div>

                                <div>
                                  <div className="expanded-label">
                                    Âge du porteur
                                  </div>
                                  <div>{t.cardholder_age ?? "-"}</div>
                                </div>

                                <div>
                                  <div className="expanded-label">
                                    Transaction étrangère
                                  </div>
                                  <div>
                                    {t.foreign_transaction === 1
                                      ? "Oui"
                                      : "Non"}
                                  </div>
                                </div>

                                <div>
                                  <div className="expanded-label">
                                    Incohérence localisation
                                  </div>
                                  <div>
                                    {t.location_mismatch === 1 ? "Oui" : "Non"}
                                  </div>
                                </div>
                              </div>

                              <div className="signals-block">
                                <div className="expanded-label">
                                  Signaux d'alerte
                                </div>

                                <div className="signals-list">
                                  {t.alert_signals ? (
                                    t.alert_signals
                                      .split(",")
                                      .map((signal, index) => (
                                        <span
                                          key={index}
                                          className="signal-badge"
                                        >
                                          {signal.trim()}
                                        </span>
                                      ))
                                  ) : (
                                    <span className="no-signal">
                                      Aucun signal suspect
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
                    Aucune transaction trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
