import { useState, useEffect } from "react";
import {
  Search,
  Clock,
  AlertTriangle,
  Mail,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  Filter,
  User,
  MapPin,
  Smartphone,
  Globe,
  Calendar,
  Activity,
  Send,
  X,
  FileText,
  History,
  Ban,
} from "lucide-react";
import "./InvestigationsPage.css";

export default function InvestigationsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState({});
  const [newNote, setNewNote] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Charger les données — SEULEMENT les transactions en attente réponse client
  const fetchData = () => {
    setLoading(true);
    fetch("http://127.0.0.1:5000/api/investigations")
      .then((res) => {
        if (!res.ok) throw new Error("Erreur serveur");
        return res.json();
      })
      .then((data) => {
        // 🔥 FILTRE : uniquement celles avec statut "Investigation" (email envoyé, attente réponse)
        const waitingForClient = data.filter(
          (t) => t.status === "investigation" || t.statut === "Investigation",
        );
        setTransactions(waitingForClient);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtrage local (recherche + statut)
  const filtered = transactions.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.merchant?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "critical" && t.riskLevel === "élevé");

    return matchesSearch && matchesStatus;
  });

  // Stats
  const critical = filtered.filter((t) => t.riskLevel === "élevé");
  const waiting = filtered.filter(
    (t) => t.status === "investigation" || t.statut === "Investigation",
  );
  const expired = filtered.filter((t) => {
    // Si tu as un champ date d'envoi ou expiration, tu peux filtrer ici
    return false; // À adapter selon tes données
  });

  // Action : REFUSER uniquement
  const handleRefuse = async (txn) => {
    if (
      !window.confirm("Êtes-vous sûr de vouloir refuser cette transaction ?")
    ) {
      return;
    }

    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/transactions/${txn.id}/refuse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_user: 1,
            commentaire: "Refusée — client non répondu / fraude confirmée",
          }),
        },
      );
      if (!res.ok) throw new Error("Erreur refus");
      fetchData(); // Refresh
    } catch (err) {
      alert(err.message);
    }
  };

  // Renvoyer l'email (optionnel)
  const handleResendEmail = async (txn) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/transactions/${txn.id}/investigate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: "Rappel : Confirmation de transaction suspecte",
            message: `Relance — Merci de confirmer la transaction ${txn.id}.`,
          }),
        },
      );
      if (!res.ok) throw new Error("Erreur envoi");
      alert("Email de relance envoyé");
    } catch (err) {
      alert(err.message);
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

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Helpers UI
  const getRiskBadge = (level, score) => {
    const normalized = level?.toLowerCase() || "";
    const score100 = score || 0;

    if (normalized.includes("élev") || normalized.includes("high")) {
      return (
        <span className="badge-risk risk-high">
          <ShieldAlert size={14} />
          CRITIQUE {score100}/100
        </span>
      );
    }
    if (normalized.includes("moyen") || normalized.includes("medium")) {
      return (
        <span className="badge-risk risk-medium">
          <Shield size={14} />
          MOYEN {score100}/100
        </span>
      );
    }
    return (
      <span className="badge-risk risk-low">
        <ShieldCheck size={14} />
        FAIBLE {score100}/100
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("investigation")) {
      return (
        <span className="badge-status status-investigating">
          <Clock size={12} />
          En attente réponse client
        </span>
      );
    }
    return (
      <span className="badge-status status-pending">
        <Clock size={12} />
        En attente
      </span>
    );
  };

  return (
    <div className="investigations-page">
      {/* ─── HEADER ─── */}
      <div className="page-header-section">
        <div>
          <h1 className="page-title">Investigations en cours</h1>
          <p className="page-subtitle">
            {filtered.length} transaction(s) en attente de réponse client
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={fetchData}>
            <History size={16} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ─── STATS CARDS ─── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue">
            <Mail size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value text-blue">{filtered.length}</div>
            <div className="stat-label">Emails envoyés</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-red">
            <ShieldAlert size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value text-red">{critical.length}</div>
            <div className="stat-label">Risque critique</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value text-amber">{waiting.length}</div>
            <div className="stat-label">En attente réponse</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green">
            <CheckCircle size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-value text-green">—</div>
            <div className="stat-label">Confirmées client</div>
          </div>
        </div>
      </div>

      {/* ─── FILTERS BAR ─── */}
      <div className="filters-bar-modern">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher par ID, client, marchand..."
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
              Tous
            </button>
            <button
              className={
                filterStatus === "critical" ? "filter-tab active" : "filter-tab"
              }
              onClick={() => setFilterStatus("critical")}
            >
              Critique
            </button>
          </div>
        </div>
      </div>

      {/* ─── LISTE DES TRANSACTIONS ─── */}
      <div className="transactions-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Chargement des investigations...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertTriangle size={32} />
            <p>{error}</p>
            <button onClick={fetchData}>Réessayer</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Mail size={48} />
            <p>Aucune investigation en attente</p>
            <span className="empty-sub">
              Les transactions en attente de réponse client apparaîtront ici
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
                {/* CARD HEADER */}
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
                            CRITIQUE {txn.riskScore}/100
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
                      {/* 🔥 SEUL BOUTON : REFUSER */}
                      <button
                        className="icon-btn danger-hover"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefuse(txn);
                        }}
                        title="Refuser la transaction"
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

                {/* EXPANDED CONTENT */}
                {isOpen && (
                  <div className="card-body">
                    <div className="details-grid">
                      {/* LEFT COLUMN - INFO & ACTIONS */}
                      <div className="details-section">
                        <h4 className="section-title">
                          <Activity size={16} />
                          Signaux d'alerte
                        </h4>
                        <div className="signals-grid">
                          {txn.flags?.map((flag, i) => (
                            <span key={i} className="signal-tag">
                              <AlertTriangle size={12} />
                              {flag.trim()}
                            </span>
                          )) || (
                            <span className="no-signals">Aucun signal</span>
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
                              <Smartphone size={14} /> Appareil
                            </span>
                            <span className="info-value">
                              {txn.deviceType || "Inconnu"}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">
                              <Mail size={14} /> Email
                            </span>
                            <span className="info-value">
                              {txn.email || "—"}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="info-label">
                              <User size={14} /> Téléphone
                            </span>
                            <span className="info-value">
                              {txn.phone || "—"}
                            </span>
                          </div>
                        </div>

                        {/* 🔥 SEULE ACTION : REFUSER */}
                        <div className="action-buttons single-action">
                          <button
                            className="btn-danger-full"
                            onClick={() => handleRefuse(txn)}
                          >
                            <Ban size={18} />
                            <div className="btn-content">
                              <span className="btn-label">
                                Refuser la transaction
                              </span>
                              <span className="btn-sublabel">
                                Marquer comme fraude
                              </span>
                            </div>
                          </button>

                          <button
                            className="btn-ghost"
                            onClick={() => handleResendEmail(txn)}
                          >
                            <Send size={16} />
                            Renvoyer l'email
                          </button>
                        </div>
                      </div>

                      {/* RIGHT COLUMN - NOTES */}
                      <div className="details-section">
                        <h4 className="section-title">
                          <FileText size={16} />
                          Notes d'investigation
                          <span className="note-count">{txnNotes.length}</span>
                        </h4>

                        <div className="notes-list">
                          {txnNotes.length === 0 ? (
                            <div className="no-notes">
                              <MessageSquare size={24} />
                              <p>Aucune note pour le moment</p>
                            </div>
                          ) : (
                            txnNotes.map((note, i) => (
                              <div key={i} className="note-item">
                                <div className="note-header">
                                  <span className="note-author">Agent</span>
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
                            placeholder="Ajouter une note..."
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
