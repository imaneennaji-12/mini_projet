import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Bell,
  ShieldAlert,
  Volume2,
  VolumeX,
  AlertTriangle,
  Menu, // ← AJOUT
  LogOut, // ← AJOUT
} from "lucide-react";
import "./Topbar.css";
import { io } from "socket.io-client";

/* ── Audio Engine ── */
const AudioEngine = {
  ctx: null,
  initialized: false,
  pendingAlert: false,

  init() {
    if (this.initialized) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
      if (this.pendingAlert) {
        this.pendingAlert = false;
        setTimeout(() => this.playFraudAlert(), 150);
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  isReady() {
    if (!this.initialized) return false;
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx.state === "running";
  },

  playFraudAlert() {
    if (!this.initialized) {
      this.pendingAlert = true;
      return;
    }
    if (!this.isReady()) {
      this.pendingAlert = true;
      return;
    }

    const ctx = this.ctx,
      now = ctx.currentTime;
    const osc1 = ctx.createOscillator(),
      gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.3);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator(),
      gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, now + 0.15);
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  },
};

export default function Topbar({ openSidebar }) {
  // ← AJOUT prop openSidebar
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [openNotif, setOpenNotif] = useState(false);
  const [highRiskFlash, setHighRiskFlash] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playedAlertIds = useRef(new Set());
  const prevAlertsRef = useRef([]);
  const dropdownRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const INACTIVITY_DELAY = 10000;

  const displayName =
    user?.prenom && user?.nom
      ? `${user.prenom} ${user.nom}`
      : user?.nom || user?.email?.split("@")[0] || "Utilisateur";
  const role = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "Analyste";

  /* Audio unlock */
  useEffect(() => {
    const unlock = () => AudioEngine.init();
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  /* Clic extérieur */
  useEffect(() => {
    if (!openNotif) return;
    const handle = (e) => {
      const bell = document.querySelector(".notif-icon");
      if (bell?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) {
        resetInactivity();
        return;
      }
      setOpenNotif(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [openNotif]);

  /* Inactivité */
  const resetInactivity = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(
      () => setOpenNotif(false),
      INACTIVITY_DELAY,
    );
  }, []);
  useEffect(() => {
    if (openNotif) resetInactivity();
  }, [openNotif, resetInactivity]);

  /* Fetch + Socket */
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/api/notifications");
        const data = await res.json();
        setAlerts(data);
      } catch (err) {
        console.error("Erreur notifications:", err);
      }
    };
    fetchAlerts();
    const socket = io("http://127.0.0.1:5000");
    socket.on("new_transaction", (tx) => {
      fetchAlerts();
      if ((tx?.risk_score || tx?.score || 0) >= 0.8 || tx?.is_high_risk)
        triggerAlert(tx);
    });
    socket.on("high_risk_alert", (data) => {
      fetchAlerts();
      triggerAlert(data);
    });
    return () => socket.disconnect();
  }, []);

  /* Détection nouvelles alertes */
  useEffect(() => {
    const newOnes = alerts.filter(
      (a) => !prevAlertsRef.current.find((p) => p.id === a.id),
    );
    newOnes.forEach((a) => {
      const isHigh = a.risk_score >= 0.8 || a.priority === "high" || a.is_fraud;
      if (isHigh && !playedAlertIds.current.has(a.id)) {
        playedAlertIds.current.add(a.id);
        triggerAlert(a);
      }
    });
    prevAlertsRef.current = alerts;
  }, [alerts]);

  const triggerAlert = useCallback(
    (data) => {
      if (soundEnabled) AudioEngine.playFraudAlert();
      setHighRiskFlash(true);
      setTimeout(() => setHighRiskFlash(false), 2000);
      setOpenNotif(true);
    },
    [soundEnabled],
  );

  const highRiskCount = alerts.filter(
    (a) => a.risk_score >= 0.8 || a.priority === "high" || a.is_fraud,
  ).length;

  return (
    <nav className={`navbar ${highRiskFlash ? "navbar--alert" : ""}`}>
      <div className="nav-left">
        {/* ← BOUTON MENU MOBILE */}
        <button
          className="mobile-menu-btn"
          onClick={openSidebar}
          title="Ouvrir le menu"
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        <span
          className={`status-dot ${highRiskFlash ? "status-dot--alert" : ""}`}
        />
        <span className="status-label">
          {highRiskFlash ? "⚠️ ALERTE FRAUDE DÉTECTÉE" : "Surveillance active"}
        </span>
      </div>

      <div className="nav-right">
        {/* Notifications */}
        <div className="notif-container">
          <div
            className={`notif-icon ${highRiskCount > 0 ? "notif-icon--urgent" : ""}`}
            onClick={() => setOpenNotif((p) => !p)}
          >
            <Bell size={20} strokeWidth={1.8} />
            {alerts.length > 0 && (
              <span
                className={`notif-badge ${highRiskCount > 0 ? "notif-badge--urgent" : ""}`}
              >
                {alerts.length}
              </span>
            )}
            {highRiskCount > 0 && <span className="notif-pulse" />}
          </div>

          {openNotif && (
            <div
              className="notif-dropdown"
              ref={dropdownRef}
              onMouseEnter={resetInactivity}
              onMouseMove={resetInactivity}
            >
              <div className="notif-header">
                <div className="notif-header-left">
                  <div
                    className={`notif-header-icon ${highRiskCount > 0 ? "notif-header-icon--urgent" : ""}`}
                  >
                    {highRiskCount > 0 ? (
                      <ShieldAlert size={15} color="#ef4444" />
                    ) : (
                      <Bell size={15} color="#3b82f6" />
                    )}
                  </div>
                  <div>
                    <div className="notif-header-title">
                      {highRiskCount > 0
                        ? `🔴 ${highRiskCount} Alerte${highRiskCount > 1 ? "s" : ""} Critique${highRiskCount > 1 ? "s" : ""}`
                        : "Alertes de fraude"}
                    </div>
                    <div className="notif-header-sub">
                      TEMPS RÉEL · CONFIDENTIEL
                    </div>
                  </div>
                </div>
                <div className="notif-header-right">
                  <button
                    className={`sound-toggle-dropdown ${!soundEnabled ? "sound-toggle-dropdown--off" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSoundEnabled(!soundEnabled);
                    }}
                    title={
                      soundEnabled ? "Désactiver le son" : "Activer le son"
                    }
                  >
                    {soundEnabled ? (
                      <Volume2 size={14} />
                    ) : (
                      <VolumeX size={14} />
                    )}
                  </button>
                  {alerts.length > 0 && (
                    <span
                      className={`notif-count-pill ${highRiskCount > 0 ? "notif-count-pill--urgent" : ""}`}
                    >
                      {alerts.length}{" "}
                      {alerts.length === 1 ? "ACTIVE" : "ACTIVES"}
                    </span>
                  )}
                </div>
              </div>

              <div className="notif-list">
                {alerts.length === 0 ? (
                  <div className="notif-empty">
                    <div className="notif-empty-icon">🛡️</div>
                    <div className="notif-empty-text">
                      Aucune alerte détectée
                    </div>
                  </div>
                ) : (
                  alerts
                    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
                    .slice(0, 5)
                    .map((a) => {
                      const isHigh =
                        a.risk_score >= 0.8 ||
                        a.priority === "high" ||
                        a.is_fraud;
                      return (
                        <div
                          key={a.id}
                          className={`notif-item ${isHigh ? "notif-item--urgent" : ""}`}
                          onClick={() => {
                            navigate("/transactions");
                            setOpenNotif(false);
                          }}
                        >
                          <div
                            className={`notif-item-dot ${isHigh ? "notif-item-dot--urgent" : ""}`}
                          />
                          <div className="notif-item-body">
                            <div className="notif-item-title">
                              {isHigh ? (
                                <>
                                  <AlertTriangle
                                    size={12}
                                    className="inline-icon"
                                  />{" "}
                                  Transaction suspecte — RISQUE ÉLEVÉ
                                </>
                              ) : (
                                "Transaction suspecte"
                              )}
                            </div>
                            <div className="notif-item-meta">
                              <span className="notif-item-amount">
                                {a.montant} MAD
                              </span>
                              <span className="notif-item-sep" />
                              <span className="notif-item-city">{a.city}</span>
                              {a.risk_score && (
                                <>
                                  <span className="notif-item-sep" />
                                  <span
                                    className={`notif-risk-score ${isHigh ? "notif-risk-score--high" : ""}`}
                                  >
                                    Risque: {Math.round(a.risk_score * 100)}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <span
                            className={`notif-item-badge ${isHigh ? "notif-item-badge--urgent" : ""}`}
                          >
                            {isHigh ? "CRITIQUE" : "FRAUDE"}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>

              <div
                className="notif-footer"
                onClick={() => {
                  navigate("/transactions");
                  setOpenNotif(false);
                }}
              >
                Voir toutes les alertes →
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="user-info">
          <div className="avatar">
            {displayName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="user-name-role">
            <div className="user-name">{displayName}</div>
            <div className="user-role">{role}</div>
          </div>
        </div>

        {/* Logout — icône Lucide + texte masqué sur mobile */}
        <button className="logout-btn" onClick={logout} title="Déconnexion">
          <LogOut size={16} strokeWidth={2} className="logout-icon" />
          {/* <span className="logout-icon">⏻</span> */}
          <span className="logout-text">DÉCONNEXION</span>
        </button>
      </div>
    </nav>
  );
}
