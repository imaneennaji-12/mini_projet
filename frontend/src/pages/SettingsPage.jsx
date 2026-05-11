import { useState, useEffect, useCallback, useRef } from "react"; // ← useRef AJOUTÉ
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";
import {
  User,
  Shield,
  Activity,
  Globe,
  Save,
  CheckCircle,
  AlertTriangle,
  Key,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronRight,
  Moon,
  Sun,
  History,
} from "lucide-react";
import "./SettingsPage.css";

/* ══════════════════════════════════════════════
   CONSTANTES
══════════════════════════════════════════════ */
const LANGUAGES = [
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
];

/* ══════════════════════════════════════════════
   COMPOSANTS UTILITAIRES
══════════════════════════════════════════════ */
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <span className="field-error">
      <AlertTriangle size={11} />
      {msg}
    </span>
  );
}

function PwdInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwd-wrap">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="pwd-eye"
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function StrengthBar({ password }) {
  if (!password) return null;
  const score =
    password.length < 6
      ? 1
      : password.length < 10
        ? 2
        : /[A-Z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^a-zA-Z0-9]/.test(password)
          ? 4
          : /[A-Z]/.test(password) && /[0-9]/.test(password)
            ? 3
            : 2;
  const labels = ["", "Faible", "Moyen", "Bon", "Fort"];
  const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  return (
    <div className="strength-wrap">
      <div className="strength-bar">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="strength-seg"
            style={{ background: i <= score ? colors[score] : "#e2e8f0" }}
          />
        ))}
      </div>
      <span className="strength-label" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  );
}

function SliderField({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  format,
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-field">
      <div className="slider-header">
        <div>
          <span className="slider-label">{label}</span>
          {description && <span className="slider-desc">{description}</span>}
        </div>
        <span className="slider-val">{format ? format(value) : value}</span>
      </div>
      <div className="slider-track-wrap">
        <div className="slider-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-input"
        />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, description, icon: Icon }) {
  return (
    <div className="toggle-row">
      <div className="toggle-left">
        {Icon && <Icon size={16} className="toggle-icon" />}
        <div>
          <div className="toggle-label">{label}</div>
          {description && <div className="toggle-desc">{description}</div>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle-switch ${checked ? "on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════ */
export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [thresholdsLoading, setThresholdsLoading] = useState(true);

  /* ── Profil ── */
  const [profile, setProfile] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    _role: "",
    _date_creation: "",
  });
  const [profileErrors, setProfileErrors] = useState({});

  /* ── Sécurité ── */
  const [pwd, setPwd] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [showPwdForm, setShowPwdForm] = useState(false);

  /* ── Seuils ── */
  const [thresholds, setThresholds] = useState({
    riskHigh: 0.75,
    riskMedium: 0.45,
  });
  const [thresholdHistory, setThresholdHistory] = useState([]);

  /* ── Affichage ── */
  const [display, setDisplay] = useState({
    darkMode: false,
    language: "fr",
  });
  const [displayLoading, setDisplayLoading] = useState(true);

  /* ── Ref pour user (évite le re-déclenchement du useEffect) ── */
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /* ── Toast ── */
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Dark mode appliqué au document ── */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", display.darkMode);
  }, [display.darkMode]);

  /* ── Changer la langue i18n quand display.language change ── */
  useEffect(() => {
    if (display.language && display.language !== i18n.language) {
      i18n.changeLanguage(display.language);
      document.documentElement.dir = display.language === "ar" ? "rtl" : "ltr";
    }
  }, [display.language, i18n]);

  /* ── Chargement initial (UNE SEULE FOIS grâce à [token]) ── */
  useEffect(() => {
    if (!token) return;

    // Charger le profil (inclut darkMode + language)
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
        setDisplay({
          darkMode: data.darkMode ?? false,
          language: data.language ?? "fr",
        });
        // Appliquer immédiatement
        i18n.changeLanguage(data.language ?? "fr");
        document.documentElement.classList.toggle(
          "dark",
          data.darkMode ?? false,
        );
        document.documentElement.dir =
          (data.language ?? "fr") === "ar" ? "rtl" : "ltr";

        try {
          localStorage.setItem(
            "fs_prefs",
            JSON.stringify({
              display: {
                darkMode: data.darkMode ?? false,
                language: data.language ?? "fr",
              },
            }),
          );
        } catch {}
      })
      .catch(() => {
        // ← utilise userRef.current au lieu de user
        if (userRef.current) {
          setProfile((p) => ({
            ...p,
            nom: userRef.current.nom || "",
            prenom: userRef.current.prenom || "",
            email: userRef.current.email || "",
          }));
        }
        try {
          const saved = JSON.parse(localStorage.getItem("fs_prefs") || "{}");
          if (saved.display) {
            setDisplay((d) => ({ ...d, ...saved.display }));
            i18n.changeLanguage(saved.display.language);
            document.documentElement.classList.toggle(
              "dark",
              saved.display.darkMode,
            );
          }
        } catch {}
      })
      .finally(() => {
        setProfileLoading(false);
        setDisplayLoading(false);
      });

    // Charger les seuils
    api
      .get("/user/preferences")
      .then((data) => {
        if (data.thresholds) {
          setThresholds({
            riskMedium: Number(data.thresholds.riskMedium) || 0.45,
            riskHigh: Number(data.thresholds.riskHigh) || 0.75,
          });
        }
        if (data.history) setThresholdHistory(data.history);
      })
      .catch((err) => {
        console.warn("Impossible de charger les préférences serveur:", err);
        try {
          const saved = JSON.parse(localStorage.getItem("fs_prefs") || "{}");
          if (saved.thresholds) {
            setThresholds((t) => ({
              ...t,
              riskMedium: Number(saved.thresholds.riskMedium) || t.riskMedium,
              riskHigh: Number(saved.thresholds.riskHigh) || t.riskHigh,
            }));
          }
        } catch {}
      })
      .finally(() => setThresholdsLoading(false));

    // ← SEULE dépendance : token. Pas de user, pas de i18n.
  }, [token]);

  const persist = useCallback((key, value) => {
    try {
      const prev = JSON.parse(localStorage.getItem("fs_prefs") || "{}");
      localStorage.setItem(
        "fs_prefs",
        JSON.stringify({ ...prev, [key]: value }),
      );
    } catch {}
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setProfileErrors({});
    try {
      await api.put("/user/profile", {
        nom: profile.nom,
        prenom: profile.prenom,
        email: profile.email,
        telephone: profile.telephone,
      });
      showToast("ok", t("settings.profileUpdated"));
    } catch (err) {
      if (err.errors) {
        setProfileErrors(err.errors);
        showToast("err", t("settings.fixErrors"));
      } else showToast("err", err.message || t("settings.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (pwd.next !== pwd.confirm)
      return showToast("err", t("settings.passwordMismatch"));
    if (pwd.next.length < 8)
      return showToast("err", t("settings.passwordMinLength"));
    if (!pwd.current)
      return showToast("err", t("settings.enterCurrentPassword"));
    setSaving(true);
    try {
      await api.post("/user/change-password", {
        currentPassword: pwd.current,
        newPassword: pwd.next,
      });
      setPwd({ current: "", next: "", confirm: "" });
      setShowPwdForm(false);
      showToast("ok", t("settings.passwordChanged"));
    } catch (err) {
      showToast("err", err.message || t("settings.error"));
    } finally {
      setSaving(false);
    }
  };

  const saveThresholds = async () => {
    setSaving(true);
    try {
      const res = await api.post("/user/preferences", { thresholds });
      showToast("ok", t("settings.thresholdsSaved"));
      if (res.history) setThresholdHistory(res.history);
    } catch (err) {
      persist("thresholds", thresholds);
      showToast("ok", t("settings.thresholdsSavedLocal"));
    } finally {
      setSaving(false);
    }
  };

  const saveDisplay = async () => {
    setSaving(true);
    try {
      await api.put("/user/display", {
        darkMode: display.darkMode,
        language: display.language,
      });
      persist("display", display);
      showToast("ok", t("settings.displaySaved"));
    } catch (err) {
      persist("display", display);
      showToast("ok", t("settings.displaySavedLocal"));
    } finally {
      setSaving(false);
    }
  };

  const initials =
    `${profile.prenom?.[0] || ""}${profile.nom?.[0] || ""}`.toUpperCase() ||
    "?";

  const TABS = [
    { id: "profile", label: t("settings.profile"), icon: User },
    { id: "security", label: t("settings.security"), icon: Shield },
    { id: "thresholds", label: t("settings.thresholds"), icon: Activity },
    { id: "display", label: t("settings.display"), icon: Globe },
  ];

  return (
    <div className="sp-root">
      {toast && (
        <div className={`sp-toast sp-toast--${toast.type}`}>
          {toast.type === "ok" ? (
            <CheckCircle size={15} />
          ) : (
            <AlertTriangle size={15} />
          )}
          {toast.msg}
        </div>
      )}

      <div className="sp-header">
        <div>
          <h1 className="sp-title">{t("settings.title")}</h1>
          <p className="sp-subtitle">{t("settings.subtitle")}</p>
        </div>
      </div>

      <div className="sp-layout">
        <nav className="sp-nav">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`sp-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={17} />
                <span>{tab.label}</span>
                <ChevronRight size={13} className="sp-tab-arrow" />
              </button>
            );
          })}
        </nav>

        <div className="sp-content">
          {/* ══════════ PROFIL ══════════ */}
          {activeTab === "profile" && (
            <section className="sp-section">
              <h2 className="sp-section-title">
                <User size={19} /> {t("settings.personalInfo")}
              </h2>
              <div className="sp-profile-card">
                <div className="sp-avatar">{initials}</div>
                <div>
                  <div className="sp-profile-name">
                    {profile.prenom} {profile.nom}
                  </div>
                  <span className="sp-role-badge">
                    {profile._role || user?.role || t("settings.analyst")}
                  </span>
                  {profile._date_creation && (
                    <div className="sp-member-since">
                      {t("settings.memberSince")} {profile._date_creation}
                    </div>
                  )}
                </div>
              </div>

              {profileLoading ? (
                <div className="sp-loading">{t("settings.loading")}…</div>
              ) : (
                <div className="sp-form-grid">
                  <div className="form-field">
                    <label>{t("settings.firstName")}</label>
                    <input
                      type="text"
                      value={profile.prenom}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, prenom: e.target.value }))
                      }
                    />
                    <FieldError msg={profileErrors.prenom} />
                  </div>
                  <div className="form-field">
                    <label>
                      {t("settings.lastName")}{" "}
                      <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.nom}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, nom: e.target.value }))
                      }
                      className={profileErrors.nom ? "err" : ""}
                    />
                    <FieldError msg={profileErrors.nom} />
                  </div>
                  <div className="form-field">
                    <label>
                      {t("settings.email")} <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, email: e.target.value }))
                      }
                      className={profileErrors.email ? "err" : ""}
                    />
                    <FieldError msg={profileErrors.email} />
                  </div>
                  <div className="form-field">
                    <label>{t("settings.phone")}</label>
                    <input
                      type="tel"
                      value={profile.telephone}
                      placeholder="+212 6XX XXX XXX"
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, telephone: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              <div className="sp-actions">
                <button
                  className="btn-primary"
                  onClick={saveProfile}
                  disabled={saving || profileLoading}
                >
                  {saving ? (
                    <RefreshCw size={15} className="spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  {t("settings.save")}
                </button>
              </div>
            </section>
          )}

          {/* ══════════ SÉCURITÉ ══════════ */}
          {activeTab === "security" && (
            <section className="sp-section">
              <h2 className="sp-section-title">
                <Shield size={19} /> {t("settings.securityTitle")}
              </h2>
              <div className="sp-security-card">
                <div className="sp-security-row">
                  <div className="sp-security-info">
                    <div className="sp-security-icon">
                      <Key size={18} />
                    </div>
                    <div>
                      <div className="sp-security-label">
                        {t("settings.password")}
                      </div>
                      <div className="sp-security-sub">
                        {t("settings.changePasswordDesc")}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => setShowPwdForm((v) => !v)}
                  >
                    {showPwdForm ? t("settings.cancel") : t("settings.modify")}
                  </button>
                </div>

                {showPwdForm && (
                  <div className="sp-pwd-form">
                    <div className="form-field">
                      <label>{t("settings.currentPassword")}</label>
                      <PwdInput
                        value={pwd.current}
                        onChange={(e) =>
                          setPwd((p) => ({ ...p, current: e.target.value }))
                        }
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="form-field">
                      <label>{t("settings.newPassword")}</label>
                      <PwdInput
                        value={pwd.next}
                        onChange={(e) =>
                          setPwd((p) => ({ ...p, next: e.target.value }))
                        }
                        placeholder={t("settings.passwordMinLength")}
                      />
                      <StrengthBar password={pwd.next} />
                    </div>
                    <div className="form-field">
                      <label>{t("settings.confirm")}</label>
                      <PwdInput
                        value={pwd.confirm}
                        onChange={(e) =>
                          setPwd((p) => ({ ...p, confirm: e.target.value }))
                        }
                        placeholder={t("settings.repeatPassword")}
                      />
                      {pwd.confirm && pwd.confirm !== pwd.next && (
                        <FieldError msg={t("settings.passwordMismatch")} />
                      )}
                    </div>
                    <button
                      className="btn-primary"
                      onClick={savePassword}
                      disabled={saving}
                    >
                      {saving ? (
                        <RefreshCw size={15} className="spin" />
                      ) : (
                        <Lock size={15} />
                      )}
                      {t("settings.updatePassword")}
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ══════════ SEUILS ══════════ */}
          {activeTab === "thresholds" && (
            <section className="sp-section">
              <h2 className="sp-section-title">
                <Activity size={19} /> {t("settings.riskThresholds")}
              </h2>

              {thresholdsLoading ? (
                <div className="sp-loading">
                  {t("settings.loadingThresholds")}…
                </div>
              ) : (
                <>
                  <div className="sp-risk-visual">
                    <div className="sp-risk-legend">
                      <span
                        className="leg-dot"
                        style={{ background: "#22c55e" }}
                      />{" "}
                      {t("settings.low")}
                      <span
                        className="leg-dot"
                        style={{ background: "#f59e0b", marginLeft: 16 }}
                      />{" "}
                      {t("settings.medium")}
                      <span
                        className="leg-dot"
                        style={{ background: "#ef4444", marginLeft: 16 }}
                      />{" "}
                      {t("settings.high")}
                    </div>
                    <div className="sp-risk-bar">
                      <div
                        className="sp-risk-seg seg-low"
                        style={{
                          width: `${(thresholds.riskMedium * 100).toFixed(1)}%`,
                        }}
                      >
                        <span>{(thresholds.riskMedium * 100).toFixed(0)}%</span>
                      </div>
                      <div
                        className="sp-risk-seg seg-med"
                        style={{
                          width: `${((thresholds.riskHigh - thresholds.riskMedium) * 100).toFixed(1)}%`,
                        }}
                      >
                        <span>
                          {(
                            (thresholds.riskHigh - thresholds.riskMedium) *
                            100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <div
                        className="sp-risk-seg seg-high"
                        style={{
                          width: `${((1 - thresholds.riskHigh) * 100).toFixed(1)}%`,
                        }}
                      >
                        <span>
                          {((1 - thresholds.riskHigh) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sp-threshold-group">
                    <h3 className="sp-group-title">
                      {t("settings.riskLevels")}
                    </h3>
                    <SliderField
                      label={t("settings.riskMedium")}
                      description={t("settings.riskMediumDesc")}
                      value={thresholds.riskMedium}
                      min={0.2}
                      max={0.6}
                      step={0.05}
                      onChange={(v) =>
                        setThresholds((t) => ({
                          ...t,
                          riskMedium: Math.min(v, t.riskHigh - 0.05),
                        }))
                      }
                      format={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <SliderField
                      label={t("settings.riskHigh")}
                      description={t("settings.riskHighDesc")}
                      value={thresholds.riskHigh}
                      min={0.5}
                      max={0.95}
                      step={0.05}
                      onChange={(v) =>
                        setThresholds((t) => ({
                          ...t,
                          riskHigh: Math.max(v, t.riskMedium + 0.05),
                        }))
                      }
                      format={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                  </div>

                  <div className="sp-actions">
                    <button
                      className="btn-primary"
                      onClick={saveThresholds}
                      disabled={saving}
                    >
                      {saving ? (
                        <RefreshCw size={15} className="spin" />
                      ) : (
                        <Save size={15} />
                      )}
                      {t("settings.saveThresholds")}
                    </button>
                  </div>

                  <div className="sp-threshold-history">
                    <h3 className="sp-group-title">
                      <History size={16} /> {t("settings.history")}
                    </h3>
                    {thresholdHistory.length === 0 ? (
                      <div className="sp-empty-state">
                        <History size={32} className="sp-empty-icon" />
                        <p>{t("settings.noHistory")}</p>
                      </div>
                    ) : (
                      <div className="sp-table-wrap">
                        <table className="sp-data-table">
                          <thead>
                            <tr>
                              <th>{t("settings.date")}</th>
                              <th>{t("settings.riskMedium")}</th>
                              <th>{t("settings.riskHigh")}</th>
                              <th>{t("settings.modifiedBy")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {thresholdHistory.map((entry) => (
                              <tr key={entry.id || Math.random()}>
                                <td>{entry.date || "-"}</td>
                                <td>
                                  <span className="sp-badge sp-badge--warning">
                                    {entry.riskMedium !== undefined
                                      ? `${(Number(entry.riskMedium) * 100).toFixed(0)}%`
                                      : "-"}
                                  </span>
                                </td>
                                <td>
                                  <span className="sp-badge sp-badge--danger">
                                    {entry.riskHigh !== undefined
                                      ? `${(Number(entry.riskHigh) * 100).toFixed(0)}%`
                                      : "-"}
                                  </span>
                                </td>
                                <td>
                                  <div className="sp-user-cell">
                                    <div className="sp-avatar-sm">
                                      {entry.modifiedBy
                                        ? entry.modifiedBy
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                        : "?"}
                                    </div>
                                    <span>
                                      {entry.modifiedBy || t("settings.system")}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {/* ══════════ AFFICHAGE ══════════ */}
          {activeTab === "display" && (
            <section className="sp-section">
              <h2 className="sp-section-title">
                <Globe size={19} /> {t("settings.displayTitle")}
              </h2>

              {displayLoading ? (
                <div className="sp-loading">
                  {t("settings.loadingDisplay")}…
                </div>
              ) : (
                <>
                  <div className="sp-display-group">
                    <h3 className="sp-group-title">{t("settings.theme")}</h3>
                    <Toggle
                      checked={display.darkMode}
                      onChange={(v) =>
                        setDisplay((d) => ({ ...d, darkMode: v }))
                      }
                      label={
                        display.darkMode
                          ? t("settings.darkMode")
                          : t("settings.lightMode")
                      }
                      description={t("settings.darkModeDesc")}
                      icon={display.darkMode ? Moon : Sun}
                    />
                  </div>

                  <div className="sp-display-group">
                    <h3 className="sp-group-title">
                      {t("settings.interfaceLanguage")}
                    </h3>
                    <div className="sp-lang-grid">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.value}
                          className={`sp-lang-card ${display.language === lang.value ? "selected" : ""}`}
                          onClick={() =>
                            setDisplay((d) => ({ ...d, language: lang.value }))
                          }
                        >
                          <span className="sp-lang-flag">{lang.flag}</span>
                          <span className="sp-lang-name">{lang.label}</span>
                          {display.language === lang.value && (
                            <CheckCircle size={14} className="sp-lang-check" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sp-actions">
                    <button
                      className="btn-primary"
                      onClick={saveDisplay}
                      disabled={saving}
                    >
                      {saving ? (
                        <RefreshCw size={15} className="spin" />
                      ) : (
                        <Save size={15} />
                      )}
                      {t("settings.savePreferences")}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
