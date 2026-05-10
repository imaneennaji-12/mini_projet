import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import {
  User,
  Bell,
  Shield,
  Database,
  Mail,
  Save,
  CheckCircle,
  AlertTriangle,
  Key,
  Moon,
  Sun,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronRight,
  Trash2,
  Download,
  Activity,
  Cpu,
  Wifi,
  Server,
  HardDrive,
  Clock,
  Zap,
} from "lucide-react";
import "./SettingsPage.css";

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // ── Profile ──────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    _role: "",
    _date_creation: "",
  });
  const [profileErrors, setProfileErrors] = useState({});

  // ── Security ─────────────────────────────────────────────────
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    sessionTimeout: 30, // minutes
  });
  const [showCurPwd, setShowCurPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Timer ref pour le timeout de session
  const inactivityTimer = useRef(null);

  // ── Notifications ────────────────────────────────────────────
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushAlerts: true,
    fraudCritical: true,
    fraudHigh: true,
    fraudMedium: false,
    dailyDigest: true,
    weeklyReport: true,
    investigationUpdates: true,
  });

  // ── System ───────────────────────────────────────────────────
  const [system, setSystem] = useState({
    apiEndpoint: "http://127.0.0.1:5000",
    modelVersion: "v2.4.1",
    autoRefresh: true,
    refreshInterval: 30,
    darkMode: false,
    language: "fr",
    timezone: "Africa/Casablanca",
    dataRetention: 90,
  });

  // ── Thresholds ───────────────────────────────────────────────
  const [thresholds, setThresholds] = useState({
    riskHigh: 0.75,
    riskMedium: 0.45,
    autoBlock: true,
    autoBlockThreshold: 0.9,
    velocityLimit: 10,
    amountLimit: 50000,
  });

  // ── Email templates ──────────────────────────────────────────
  const [emailTemplates, setEmailTemplates] = useState({
    investigationSubject: "Confirmation de transaction suspecte",
    investigationBody:
      "Nous avons détecté une transaction suspecte.\n\nRéférence : {transaction_id}\nMontant : {montant} MAD\nDate : {date}",
    reminderSubject: "Rappel : Confirmation de transaction suspecte",
    reminderBody:
      "Relance — Merci de confirmer la transaction {transaction_id}.",
  });

  const [systemStatus] = useState({
    apiStatus: "online",
    modelStatus: "active",
    lastTraining: "2026-05-01",
    dbStatus: "connected",
    cpuUsage: 34,
    memoryUsage: 62,
    diskUsage: 45,
  });

  // ════════════════════════════════════════════════════════════
  // CHARGEMENT du profil + prefs au montage
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!token) return;

    // Charge le profil
    api
      .get("/user/profile")
      .then((data) => {
        setProfile({
          nom: data.nom || "",
          prenom: data.prenom || "",
          email: data.email || "",
          telephone: data.telephone || "",
          _role: data.role || "",
          _date_creation: data.date_creation || "",
        });
      })
      .catch(() => {
        if (user)
          setProfile((p) => ({
            ...p,
            nom: user.nom || "",
            prenom: user.prenom || "",
            email: user.email || "",
          }));
      })
      .finally(() => setProfileLoading(false));

    // Charge les préférences (timeout, notifs, etc.)
    api
      .get("/user/preferences")
      .then((data) => {
        const p = data.preferences || {};
        if (p.security?.sessionTimeout) {
          setSecurity((s) => ({
            ...s,
            sessionTimeout: p.security.sessionTimeout,
          }));
        }
        if (p.notifications)
          setNotifications((n) => ({ ...n, ...p.notifications }));
        if (p.system) setSystem((s) => ({ ...s, ...p.system }));
        if (p.thresholds) setThresholds((t) => ({ ...t, ...p.thresholds }));
        if (p.email) setEmailTemplates((e) => ({ ...e, ...p.email }));
      })
      .catch(console.error);
  }, [token, user]);

  // ════════════════════════════════════════════════════════════
  // TIMER DE SESSION — déconnexion réelle après inactivité
  // ════════════════════════════════════════════════════════════
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    const ms = security.sessionTimeout * 60 * 1000;
    inactivityTimer.current = setTimeout(() => {
      logout();
    }, ms);
  }, [security.sessionTimeout, logout]);

  useEffect(() => {
    if (!token) return;
    resetInactivityTimer();

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const listener = () => resetInactivityTimer();

    events.forEach((e) => window.addEventListener(e, listener));
    return () => {
      events.forEach((e) => window.removeEventListener(e, listener));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [token, resetInactivityTimer]);

  // ════════════════════════════════════════════════════════════
  // Flash messages
  // ════════════════════════════════════════════════════════════
  const flashSaved = () => {
    setSaved(true);
    setSaveError("");
    setTimeout(() => setSaved(false), 3000);
  };
  const flashError = (m) => {
    setSaveError(m);
    setSaved(false);
    setTimeout(() => setSaveError(""), 4000);
  };

  // ════════════════════════════════════════════════════════════
  // SAUVEGARDE PROFIL → PUT /api/user/profile
  // ════════════════════════════════════════════════════════════
  const handleSaveProfile = async () => {
    setSaving(true);
    setProfileErrors({});
    try {
      await api.put("/user/profile", {
        nom: profile.nom,
        prenom: profile.prenom,
        email: profile.email,
        telephone: profile.telephone,
      });
      flashSaved();
    } catch (err) {
      if (err.errors) {
        setProfileErrors(err.errors);
        flashError("Corrigez les erreurs du formulaire");
      } else flashError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // CHANGEMENT MOT DE PASSE → POST /api/user/change-password
  // ════════════════════════════════════════════════════════════
  const handlePasswordChange = async () => {
    if (security.newPassword !== security.confirmPassword) {
      flashError("Les mots de passe ne correspondent pas");
      return;
    }
    if (security.newPassword.length < 8) {
      flashError("Minimum 8 caractères");
      return;
    }
    setSaving(true);
    try {
      await api.post("/user/change-password", {
        currentPassword: security.currentPassword,
        newPassword: security.newPassword,
      });
      setSecurity((s) => ({
        ...s,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setShowPassword(false);
      flashSaved();
    } catch (err) {
      flashError(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // SAUVEGARDE GÉNÉRIQUE → POST /api/user/preferences
  // ════════════════════════════════════════════════════════════
  const handleSave = async (section) => {
    setSaving(true);
    try {
      const payloads = {
        notifications,
        system,
        thresholds,
        email: emailTemplates,
      };
      await api.post("/user/preferences", { [section]: payloads[section] });
      flashSaved();
    } catch (err) {
      flashError(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarde spécifique pour la sécurité (timeout)
  const handleSaveSecurity = async () => {
    setSaving(true);
    try {
      await api.post("/user/preferences", {
        security: { sessionTimeout: security.sessionTimeout },
      });
      flashSaved();
      resetInactivityTimer(); // redémarre le timer avec la nouvelle valeur
    } catch (err) {
      flashError(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get("/user/export-data");
      const blob = new Blob([JSON.stringify(res, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${user?.nom}_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      flashError("Erreur lors de l'export (route backend manquante ?)");
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Êtes-vous absolument sûr ? Cette action est irréversible.",
      )
    )
      return;
    try {
      await api.delete("/user/account");
      logout();
    } catch (err) {
      flashError(err.message || "Erreur (route backend manquante ?)");
    }
  };

  // Force du mot de passe
  const pwdStr =
    security.newPassword.length === 0
      ? 0
      : security.newPassword.length < 6
        ? 1
        : security.newPassword.length < 10
          ? 2
          : /[A-Z]/.test(security.newPassword) &&
              /[0-9]/.test(security.newPassword)
            ? 4
            : 3;
  const strLabel = ["", "Faible", "Moyen", "Bon", "Fort"];
  const strColor = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"];

  const initials =
    `${profile.prenom?.[0] || ""}${profile.nom?.[0] || ""}`.toUpperCase() ||
    "?";

  const tabs = [
    { id: "profile", label: "Profil", icon: User },
    { id: "security", label: "Sécurité", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "thresholds", label: "Seuils & Règles", icon: Activity },
    { id: "email", label: "Emails", icon: Mail },
    { id: "system", label: "Système & API", icon: Server },
  ];

  const SaveBtn = ({ onClick }) => (
    <button className="btn-primary" onClick={onClick} disabled={saving}>
      {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
      Sauvegarder
    </button>
  );

  return (
    <div className="settings-page">
      {/* ── Header ── */}
      <div className="settings-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">
            Gérez vos préférences et la configuration du système
          </p>
        </div>
        {saved && (
          <div className="save-indicator">
            <CheckCircle size={16} /> Sauvegardé
          </div>
        )}
        {saveError && (
          <div
            className="save-indicator"
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
            }}
          >
            <AlertTriangle size={16} /> {saveError}
          </div>
        )}
      </div>

      <div className="settings-layout">
        {/* ── Sidebar ── */}
        <div className="settings-sidebar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
              <ChevronRight size={14} className="tab-arrow" />
            </button>
          ))}
          <div className="sidebar-divider" />
          <div className="system-status-mini">
            <div
              className={`status-dot ${systemStatus.apiStatus === "online" ? "online" : "offline"}`}
            />
            <span>
              API{" "}
              {systemStatus.apiStatus === "online" ? "En ligne" : "Hors ligne"}
            </span>
          </div>
          <div className="system-status-mini">
            <div
              className={`status-dot ${systemStatus.modelStatus === "active" ? "online" : "warning"}`}
            />
            <span>
              Modèle{" "}
              {systemStatus.modelStatus === "active" ? "Actif" : "Inactif"}
            </span>
          </div>
        </div>

        <div className="settings-content">
          {/* ══════════════════════════════════════════════
              PROFIL
          ══════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="settings-section">
              <h2 className="section-title">
                <User size={20} />
                Informations personnelles
              </h2>

              <div className="profile-header">
                <div className="avatar-section">
                  <div className="avatar-placeholder">{initials}</div>
                </div>
                <div className="profile-meta">
                  <h3>
                    {profile.prenom} {profile.nom}
                  </h3>
                  <span className="role-badge">
                    {profile._role || user?.role || "Analyste"}
                  </span>
                  {profile._date_creation && (
                    <p className="member-since">
                      Membre depuis le {profile._date_creation}
                    </p>
                  )}
                </div>
              </div>

              {profileLoading ? (
                <div style={{ padding: 24, color: "#94a3b8" }}>
                  Chargement du profil…
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Prénom</label>
                    <input
                      type="text"
                      value={profile.prenom}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, prenom: e.target.value }))
                      }
                      style={
                        profileErrors.prenom ? { borderColor: "#ef4444" } : {}
                      }
                    />
                    {profileErrors.prenom && (
                      <span style={{ color: "#ef4444", fontSize: 12 }}>
                        {profileErrors.prenom}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Nom *</label>
                    <input
                      type="text"
                      value={profile.nom}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, nom: e.target.value }))
                      }
                      style={
                        profileErrors.nom ? { borderColor: "#ef4444" } : {}
                      }
                    />
                    {profileErrors.nom && (
                      <span style={{ color: "#ef4444", fontSize: 12 }}>
                        {profileErrors.nom}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, email: e.target.value }))
                      }
                      style={
                        profileErrors.email ? { borderColor: "#ef4444" } : {}
                      }
                    />
                    {profileErrors.email && (
                      <span style={{ color: "#ef4444", fontSize: 12 }}>
                        {profileErrors.email}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Téléphone</label>
                    <input
                      type="tel"
                      value={profile.telephone}
                      placeholder="+212 6XX XXX XXX"
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          telephone: e.target.value,
                        }))
                      }
                      style={
                        profileErrors.telephone
                          ? { borderColor: "#ef4444" }
                          : {}
                      }
                    />
                    {profileErrors.telephone && (
                      <span style={{ color: "#ef4444", fontSize: 12 }}>
                        {profileErrors.telephone}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="section-actions">
                <button
                  className="btn-primary"
                  onClick={handleSaveProfile}
                  disabled={saving || profileLoading}
                >
                  {saving ? (
                    <RefreshCw size={16} className="spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Sauvegarder le profil
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              SÉCURITÉ
          ══════════════════════════════════════════════ */}
          {activeTab === "security" && (
            <div className="settings-section">
              <h2 className="section-title">
                <Shield size={20} />
                Sécurité du compte
              </h2>

              {/* Mot de passe */}
              <div className="security-card">
                <div className="security-item">
                  <div className="security-info">
                    <Key size={18} />
                    <div>
                      <h4>Mot de passe</h4>
                      <p>Modifiez votre mot de passe de connexion</p>
                    </div>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Annuler" : "Modifier"}
                  </button>
                </div>

                {showPassword && (
                  <div className="password-form">
                    <div className="form-group">
                      <label>Mot de passe actuel</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showCurPwd ? "text" : "password"}
                          value={security.currentPassword}
                          onChange={(e) =>
                            setSecurity((s) => ({
                              ...s,
                              currentPassword: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurPwd((v) => !v)}
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#94a3b8",
                          }}
                        >
                          {showCurPwd ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Nouveau mot de passe</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showNewPwd ? "text" : "password"}
                          placeholder="Min. 8 caractères"
                          value={security.newPassword}
                          onChange={(e) =>
                            setSecurity((s) => ({
                              ...s,
                              newPassword: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPwd((v) => !v)}
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#94a3b8",
                          }}
                        >
                          {showNewPwd ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                      </div>
                      {security.newPassword && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 6,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: 4,
                              borderRadius: 2,
                              background: "#e2e8f0",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pwdStr * 25}%`,
                                height: "100%",
                                background: strColor[pwdStr],
                                transition: "all 0.3s",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: strColor[pwdStr],
                            }}
                          >
                            {strLabel[pwdStr]}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Confirmer</label>
                      <input
                        type="password"
                        value={security.confirmPassword}
                        onChange={(e) =>
                          setSecurity((s) => ({
                            ...s,
                            confirmPassword: e.target.value,
                          }))
                        }
                        style={
                          security.confirmPassword &&
                          security.confirmPassword !== security.newPassword
                            ? { borderColor: "#ef4444" }
                            : {}
                        }
                      />
                      {security.confirmPassword &&
                        security.confirmPassword !== security.newPassword && (
                          <span style={{ color: "#ef4444", fontSize: 12 }}>
                            Les mots de passe ne correspondent pas
                          </span>
                        )}
                    </div>

                    <button
                      className="btn-primary"
                      onClick={handlePasswordChange}
                      disabled={saving}
                    >
                      <Lock size={16} />
                      Mettre à jour
                    </button>
                  </div>
                )}
              </div>

              {/* 2FA — masqué car non implémenté côté backend */}
              <div className="security-card" style={{ opacity: 0.6 }}>
                <div className="security-item">
                  <div className="security-info">
                    <Shield size={18} />
                    <div>
                      <h4>Authentification 2FA</h4>
                      <p>Non implémenté — Bientôt disponible</p>
                    </div>
                  </div>
                  <span
                    className="version-badge"
                    style={{ background: "#e2e8f0", color: "#64748b" }}
                  >
                    Bientôt
                  </span>
                </div>
              </div>

              {/* Session timeout — FONCTIONNEL */}
              <div className="security-card">
                <div className="security-item">
                  <div className="security-info">
                    <Clock size={18} />
                    <div>
                      <h4>Timeout de session</h4>
                      <p>Déconnexion automatique après inactivité</p>
                    </div>
                  </div>
                  <select
                    value={security.sessionTimeout}
                    onChange={(e) =>
                      setSecurity((s) => ({
                        ...s,
                        sessionTimeout: Number(e.target.value),
                      }))
                    }
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 heure</option>
                    <option value={120}>2 heures</option>
                  </select>
                </div>
                <div style={{ marginTop: 12, paddingLeft: 4 }}>
                  <button
                    className="btn-primary"
                    onClick={handleSaveSecurity}
                    disabled={saving}
                  >
                    {saving ? (
                      <RefreshCw size={16} className="spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Appliquer le timeout
                  </button>
                </div>
              </div>

              {/* Zone danger */}
              <div className="danger-zone">
                <h4>
                  <AlertTriangle size={16} /> Zone de danger
                </h4>
                <div className="danger-actions">
                  <button
                    className="btn-danger-outline"
                    onClick={handleExportData}
                  >
                    <Download size={16} />
                    Exporter mes données
                  </button>
                  <button
                    className="btn-danger-outline"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
                    Supprimer le compte
                  </button>
                </div>
              </div>

              {showDeleteConfirm && (
                <div className="delete-modal">
                  <div className="delete-modal-content">
                    <AlertTriangle size={32} className="warning-icon" />
                    <h3>Supprimer définitivement ?</h3>
                    <p>
                      Toutes vos données seront effacées. Cette action est
                      irréversible.
                    </p>
                    <div className="delete-actions">
                      <button
                        className="btn-ghost"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Annuler
                      </button>
                      <button
                        className="btn-danger"
                        onClick={handleDeleteAccount}
                      >
                        <Trash2 size={16} />
                        Confirmer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              NOTIFICATIONS
          ══════════════════════════════════════════════ */}
          {activeTab === "notifications" && (
            <div className="settings-section">
              <h2 className="section-title">
                <Bell size={20} />
                Préférences de notification
              </h2>

              {[
                {
                  group: "Canaux",
                  items: [
                    {
                      key: "emailAlerts",
                      label: "Alertes par email",
                      desc: "Notifications importantes par email",
                    },
                    {
                      key: "pushAlerts",
                      label: "Notifications push",
                      desc: "Alertes temps réel dans le navigateur",
                    },
                  ],
                },
                {
                  group: "Alertes Fraude",
                  items: [
                    {
                      key: "fraudCritical",
                      label: "Risque critique (≥75%)",
                      desc: "Action immédiate requise",
                    },
                    {
                      key: "fraudHigh",
                      label: "Risque élevé (≥45%)",
                      desc: "Investigation recommandée",
                    },
                    {
                      key: "fraudMedium",
                      label: "Risque moyen",
                      desc: "Surveillance standard",
                    },
                  ],
                },
                {
                  group: "Rapports",
                  items: [
                    {
                      key: "dailyDigest",
                      label: "Résumé quotidien",
                      desc: "Statistiques du jour",
                    },
                    {
                      key: "weeklyReport",
                      label: "Rapport hebdomadaire",
                      desc: "Analyse tendances",
                    },
                  ],
                },
              ].map(({ group, items }) => (
                <div className="notification-group" key={group}>
                  <h4>{group}</h4>
                  <div className="toggle-list">
                    {items.map(({ key, label, desc }) => (
                      <div className="toggle-item" key={key}>
                        <div className="toggle-info">
                          <div>
                            <span>{label}</span>
                            <small>{desc}</small>
                          </div>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={notifications[key]}
                            onChange={(e) =>
                              setNotifications((n) => ({
                                ...n,
                                [key]: e.target.checked,
                              }))
                            }
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="section-actions">
                <SaveBtn onClick={() => handleSave("notifications")} />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              SEUILS
          ══════════════════════════════════════════════ */}
          {activeTab === "thresholds" && (
            <div className="settings-section">
              <h2 className="section-title">
                <Activity size={20} />
                Seuils de détection & Règles métier
              </h2>
              <div className="threshold-cards">
                <div className="threshold-card">
                  <h4>Niveaux de risque</h4>
                  <div className="threshold-inputs">
                    {[
                      {
                        label: "Seuil risque élevé",
                        key: "riskHigh",
                        min: 0.5,
                        max: 1,
                        step: 0.05,
                      },
                      {
                        label: "Seuil risque moyen",
                        key: "riskMedium",
                        min: 0.2,
                        max: 0.7,
                        step: 0.05,
                      },
                    ].map(({ label, key, min, max, step }) => (
                      <div className="form-group" key={key}>
                        <label>{label}</label>
                        <div className="threshold-slider">
                          <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={thresholds[key]}
                            onChange={(e) =>
                              setThresholds((t) => ({
                                ...t,
                                [key]: Number(e.target.value),
                              }))
                            }
                          />
                          <span className="threshold-value">
                            {(thresholds[key] * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="threshold-visual">
                    <div className="risk-bar">
                      <div
                        className="risk-segment low"
                        style={{ width: `${thresholds.riskMedium * 100}%` }}
                      >
                        Faible
                      </div>
                      <div
                        className="risk-segment medium"
                        style={{
                          width: `${(thresholds.riskHigh - thresholds.riskMedium) * 100}%`,
                        }}
                      >
                        Moyen
                      </div>
                      <div
                        className="risk-segment high"
                        style={{ width: `${(1 - thresholds.riskHigh) * 100}%` }}
                      >
                        Élevé
                      </div>
                    </div>
                  </div>
                </div>
                <div className="threshold-card">
                  <h4>Règles de vélocité</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Transactions max / 24h</label>
                      <input
                        type="number"
                        value={thresholds.velocityLimit}
                        onChange={(e) =>
                          setThresholds((t) => ({
                            ...t,
                            velocityLimit: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Montant max (MAD)</label>
                      <input
                        type="number"
                        value={thresholds.amountLimit}
                        onChange={(e) =>
                          setThresholds((t) => ({
                            ...t,
                            amountLimit: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="section-actions">
                <SaveBtn onClick={() => handleSave("thresholds")} />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              EMAILS
          ══════════════════════════════════════════════ */}
          {activeTab === "email" && (
            <div className="settings-section">
              <h2 className="section-title">
                <Mail size={20} />
                Modèles d'emails
              </h2>
              <div className="email-templates">
                <div className="template-card">
                  <h4>Email d'investigation initial</h4>
                  <div className="form-group">
                    <label>Objet</label>
                    <input
                      type="text"
                      value={emailTemplates.investigationSubject}
                      onChange={(e) =>
                        setEmailTemplates((t) => ({
                          ...t,
                          investigationSubject: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Corps du message</label>
                    <textarea
                      rows={8}
                      value={emailTemplates.investigationBody}
                      onChange={(e) =>
                        setEmailTemplates((t) => ({
                          ...t,
                          investigationBody: e.target.value,
                        }))
                      }
                    />
                    <small className="template-hint">
                      Variables : {"{transaction_id}"}, {"{montant}"},{" "}
                      {"{date}"}, {"{client_nom}"}
                    </small>
                  </div>
                </div>
                <div className="template-card">
                  <h4>Email de relance</h4>
                  <div className="form-group">
                    <label>Objet</label>
                    <input
                      type="text"
                      value={emailTemplates.reminderSubject}
                      onChange={(e) =>
                        setEmailTemplates((t) => ({
                          ...t,
                          reminderSubject: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Corps du message</label>
                    <textarea
                      rows={6}
                      value={emailTemplates.reminderBody}
                      onChange={(e) =>
                        setEmailTemplates((t) => ({
                          ...t,
                          reminderBody: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="template-preview">
                  <h4>Aperçu</h4>
                  <div className="preview-box">
                    <div className="preview-header">
                      <span>De : AnalyseTransaction_IA@banque.com</span>
                      <span>Objet : {emailTemplates.investigationSubject}</span>
                    </div>
                    <div className="preview-body">
                      {emailTemplates.investigationBody
                        .replace("{transaction_id}", "TXN-2026-001")
                        .replace("{montant}", "12,500")
                        .replace("{date}", "09/05/2026")}
                    </div>
                  </div>
                </div>
              </div>
              <div className="section-actions">
                <SaveBtn onClick={() => handleSave("email")} />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              SYSTÈME
          ══════════════════════════════════════════════ */}
          {activeTab === "system" && (
            <div className="settings-section">
              <h2 className="section-title">
                <Server size={20} />
                Système & API
              </h2>
              <div className="system-grid">
                <div className="system-card">
                  <h4>Configuration API</h4>
                  <div className="form-group">
                    <label>Endpoint API</label>
                    <input
                      type="text"
                      value={system.apiEndpoint}
                      onChange={(e) =>
                        setSystem((s) => ({
                          ...s,
                          apiEndpoint: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Version du modèle ML</label>
                    <div className="model-version">
                      <Cpu size={16} />
                      <span>{system.modelVersion}</span>
                      <span className="version-badge">Actif</span>
                    </div>
                  </div>
                </div>
                <div className="system-card">
                  <h4>Interface</h4>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      {system.darkMode ? <Moon size={16} /> : <Sun size={16} />}
                      <div>
                        <span>Mode sombre</span>
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={system.darkMode}
                        onChange={(e) =>
                          setSystem((s) => ({
                            ...s,
                            darkMode: e.target.checked,
                          }))
                        }
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Langue</label>
                    <select
                      value={system.language}
                      onChange={(e) =>
                        setSystem((s) => ({ ...s, language: e.target.value }))
                      }
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                      <option value="ar">العربية</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="system-metrics">
                <h4>État du système</h4>
                <div className="metrics-grid">
                  {[
                    {
                      Icon: Wifi,
                      label: "API",
                      val:
                        systemStatus.apiStatus === "online"
                          ? "En ligne"
                          : "Hors ligne",
                      cls: systemStatus.apiStatus,
                    },
                    {
                      Icon: Database,
                      label: "Base de données",
                      val: "Connectée",
                      cls: "connected",
                    },
                    {
                      Icon: Zap,
                      label: "CPU",
                      val: `${systemStatus.cpuUsage}%`,
                    },
                    {
                      Icon: HardDrive,
                      label: "Mémoire",
                      val: `${systemStatus.memoryUsage}%`,
                    },
                    {
                      Icon: Server,
                      label: "Disque",
                      val: `${systemStatus.diskUsage}%`,
                    },
                    {
                      Icon: Clock,
                      label: "Dernier entraînement",
                      val: systemStatus.lastTraining,
                    },
                  ].map(({ Icon, label, val, cls }) => (
                    <div className="metric-item" key={label}>
                      <Icon size={16} />
                      <span>{label}</span>
                      <span
                        className={
                          cls ? `metric-status ${cls}` : "metric-value"
                        }
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="section-actions">
                <SaveBtn onClick={() => handleSave("system")} />
                <button
                  className="btn-ghost"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw size={16} />
                  Tester la connexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
