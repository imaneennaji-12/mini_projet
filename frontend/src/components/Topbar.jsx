import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { useTranslation } from "react-i18next"; // ← AJOUT
import {
  Bell,
  ShieldAlert,
  Volume2,
  VolumeX,
  AlertTriangle,
  Menu,
  LogOut,
} from "lucide-react";
import "./Topbar.css";

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
  const { t } = useTranslation(); // ← AJOUT
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { socketRef, connected } = useSocket();

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

  /* ── Fetch alerts ── */
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/notifications");
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error("⛔ Erreur fetch notifications:", err);
    }
  }, []);

  /* ── Trigger alert ── */
  const triggerAlert = useCallback(
    (data) => {
      if (soundEnabled) AudioEngine.playFraudAlert();
      setHighRiskFlash(true);
      setTimeout(() => setHighRiskFlash(false), 2000);
      setOpenNotif(true);
    },
    [soundEnabled],
  );

  /* ── Audio unlock ── */
  useEffect(() => {
    const unlock = () => AudioEngine.init();
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  /* ── Clic extérieur ── */
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

  /* ── Inactivité ── */
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

  /* ── Chargement initial HTTP ── */
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  /* ── WebSocket temps réel ── */
  useEffect(() => {
    if (!connected) return;
    const socket = socketRef.current;
    if (!socket) return;

    const onNewTransaction = (tx) => {
      fetchAlerts();
      if ((tx?.risk_score || tx?.score || 0) >= 0.8 || tx?.is_high_risk) {
        triggerAlert(tx);
      }
    };

    const onTransactionUpdated = (data) => {
      fetchAlerts();
    };

    const onInvestigationResolved = (data) => {
      fetchAlerts();
    };

    socket.on("new_transaction", onNewTransaction);
    socket.on("transaction_updated", onTransactionUpdated);
    socket.on("investigation_resolved", onInvestigationResolved);

    return () => {
      socket.off("new_transaction", onNewTransaction);
      socket.off("transaction_updated", onTransactionUpdated);
      socket.off("investigation_resolved", onInvestigationResolved);
    };
  }, [connected, socketRef, fetchAlerts, triggerAlert]);

  /* ── Détection nouvelles alertes ── */
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
  }, [alerts, triggerAlert]);

  const highRiskCount = alerts.filter(
    (a) => a.risk_score >= 0.8 || a.priority === "high" || a.is_fraud,
  ).length;

  return (
    <nav className={`navbar ${highRiskFlash ? "navbar--alert" : ""}`}>
      <div className="nav-left">
        <button
          className="mobile-menu-btn"
          onClick={openSidebar}
          title={t("topbar.openMenu")}
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        <span
          className={`status-dot ${highRiskFlash ? "status-dot--alert" : ""}`}
        />
        <span className="status-label">
          {highRiskFlash
            ? `⚠️ ${t("topbar.fraudAlertDetected")}`
            : t("topbar.activeSurveillance")}
          {connected && (
            <span style={{ marginLeft: 8, fontSize: 10, opacity: 0.6 }}>
              ● WS
            </span>
          )}
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
                        ? `🔴 ${highRiskCount} ${highRiskCount > 1 ? t("topbar.criticalAlerts") : t("topbar.criticalAlert")}`
                        : t("topbar.fraudAlerts")}
                    </div>
                    <div className="notif-header-sub">
                      {t("topbar.realTimeConfidential")}
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
                      soundEnabled
                        ? t("topbar.disableSound")
                        : t("topbar.enableSound")
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
                      {alerts.length === 1
                        ? t("topbar.activeSingular")
                        : t("topbar.activePlural")}
                    </span>
                  )}
                </div>
              </div>

              <div className="notif-list">
                {alerts.length === 0 ? (
                  <div className="notif-empty">
                    <div className="notif-empty-icon">🛡️</div>
                    <div className="notif-empty-text">
                      {t("topbar.noAlertDetected")}
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
                                  {t("topbar.suspiciousTransactionHigh")}
                                </>
                              ) : (
                                t("topbar.suspiciousTransaction")
                              )}
                            </div>
                            <div className="notif-item-meta">
                              <span className="notif-item-amount">
                                {a.montant} MAD
                              </span>
                              <span className="notif-item-sep" />
                              <span className="notif-item-city">{a.city}</span>
                              {a.risk_score != null && (
                                <>
                                  <span className="notif-item-sep" />
                                  <span
                                    className={`notif-risk-score ${isHigh ? "notif-risk-score--high" : ""}`}
                                  >
                                    {t("topbar.risk")}:{" "}
                                    {Math.round(a.risk_score * 100)}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <span
                            className={`notif-item-badge ${isHigh ? "notif-item-badge--urgent" : ""}`}
                          >
                            {isHigh ? t("topbar.critical") : t("topbar.fraud")}
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
                {t("topbar.seeAllAlerts")} →
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

        <button
          className="logout-btn"
          onClick={logout}
          title={t("sidebar.logout")}
        >
          <LogOut size={16} strokeWidth={2} className="logout-icon" />
          <span className="logout-text">
            {t("sidebar.logout").toUpperCase()}
          </span>
        </button>
      </div>
    </nav>
  );
}
