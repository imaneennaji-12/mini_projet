import { useState } from "react";
import {
  Shield,
  Bell,
  Mail,
  Key,
  Users,
  Globe,
  Save,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./SettingsPage.css";

function ToggleSwitch({ enabled, onChange, label, description }) {
  return (
    <div className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        {description && <div className="toggle-desc">{description}</div>}
      </div>
      <button className="toggle-btn" onClick={() => onChange(!enabled)}>
        {enabled ? (
          <ToggleRight size={32} color="#3b82f6" />
        ) : (
          <ToggleLeft size={32} color="#94a3b8" />
        )}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    emailAlerts: true,
    realTimeAlerts: true,
    criticalOnly: false,
    autoBlock: true,
    autoEmail: true,
    investigationEmail: true,
    twoFactor: false,
    sessionTimeout: "30",
    riskThreshold: "70",
    emailFrom: "securite@banque.com",
    bankName: "AnalyseTransaction IA",
  });

  const handleSave = async () => {
    await new Promise((r) => setTimeout(r, 800));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggle = (key) => (v) => {
    setSettings((prev) => ({ ...prev, [key]: v }));
  };

  const update = (key) => (e) => {
    setSettings((prev) => ({ ...prev, [key]: e.target.value }));
  };

  return (
    <div className="settings-page">
      {/* HEADER */}
      <div className="settings-header">
        <div>
          <h1 className="settings-title">Paramètres</h1>
          <p className="settings-subtitle">
            Configuration du système de détection
          </p>
        </div>
        <button
          className={`save-btn ${saved ? "saved" : ""}`}
          onClick={handleSave}
        >
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? "Sauvegardé !" : "Enregistrer"}
        </button>
      </div>

      {/* PROFIL */}
      <div className="settings-card">
        <div className="section-header">
          <Users size={18} color="#3b82f6" />
          Profil utilisateur
        </div>

        <div className="profile-box">
          <div className="profile-avatar">
            {user?.nom?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div>
            <div className="profile-name">{user?.nom || "Agent"}</div>
            <div className="profile-role">
              {user?.role === "admin"
                ? "Administrateur — Accès complet"
                : "Analyste Fraude — Accès lecture/écriture"}
            </div>
          </div>
        </div>

        <div className="form-grid-2">
          <div>
            <label className="form-label">Nom complet</label>
            <input
              type="text"
              defaultValue={user?.nom || ""}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Email professionnel</label>
            <input
              type="email"
              defaultValue={user?.email || ""}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* ALERTES */}
      <div className="settings-card">
        <div className="section-header">
          <Bell size={18} color="#3b82f6" />
          Alertes & Notifications
        </div>

        <ToggleSwitch
          enabled={settings.emailAlerts}
          onChange={toggle("emailAlerts")}
          label="Alertes par email"
          description="Recevoir des notifications par email pour chaque alerte"
        />
        <ToggleSwitch
          enabled={settings.realTimeAlerts}
          onChange={toggle("realTimeAlerts")}
          label="Alertes en temps réel"
          description="Notifications push dans l'interface"
        />
        <ToggleSwitch
          enabled={settings.criticalOnly}
          onChange={toggle("criticalOnly")}
          label="Alertes critiques uniquement"
          description="Recevoir seulement les alertes avec score > 85"
        />

        <div className="slider-section">
          <label className="form-label">
            Seuil de score de risque pour alerte (%)
          </label>
          <div className="slider-row">
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={settings.riskThreshold}
              onChange={update("riskThreshold")}
              className="risk-slider"
            />
            <span className="slider-value">{settings.riskThreshold}</span>
          </div>
        </div>
      </div>

      {/* EMAILS */}
      <div className="settings-card">
        <div className="section-header">
          <Mail size={18} color="#3b82f6" />
          Emails automatiques clients
        </div>

        <ToggleSwitch
          enabled={settings.autoBlock}
          onChange={toggle("autoBlock")}
          label="Email lors d'un blocage"
          description="Notifier le client quand sa transaction est bloquée"
        />
        <ToggleSwitch
          enabled={settings.autoEmail}
          onChange={toggle("autoEmail")}
          label="Email de confirmation automatique"
          description="Envoyer une demande de confirmation pour transactions suspectes"
        />
        <ToggleSwitch
          enabled={settings.investigationEmail}
          onChange={toggle("investigationEmail")}
          label="Email lors d'investigation"
          description="Informer le client qu'une investigation est en cours"
        />

        <div className="input-section">
          <label className="form-label">Adresse d'expédition des emails</label>
          <input
            type="email"
            value={settings.emailFrom}
            onChange={update("emailFrom")}
            className="form-input"
          />
        </div>
      </div>

      {/* SÉCURITÉ */}
      <div className="settings-card">
        <div className="section-header">
          <Shield size={18} color="#3b82f6" />
          Sécurité & Accès
        </div>

        <ToggleSwitch
          enabled={settings.twoFactor}
          onChange={toggle("twoFactor")}
          label="Authentification à deux facteurs"
          description="Recommandé — Protège les accès sensibles"
        />

        <div className="input-section">
          <label className="form-label">Expiration de session (minutes)</label>
          <input
            type="number"
            value={settings.sessionTimeout}
            onChange={update("sessionTimeout")}
            className="form-input form-input-sm"
            min="5"
            max="480"
          />
        </div>

        <div className="password-section">
          <button className="btn-outline">
            <Key size={14} />
            Changer le mot de passe
          </button>
        </div>
      </div>

      {/* SYSTÈME */}
      <div className="settings-card">
        <div className="section-header">
          <Globe size={18} color="#3b82f6" />
          Informations système
        </div>

        <div className="info-grid">
          {[
            { label: "Version", value: "AnalyseTransaction IA v1.0" },
            { label: "Moteur IA", value: "FraudML Engine 2.0" },
            { label: "Base de données", value: "Synchronisée" },
            { label: "Conformité", value: "PCI-DSS ✓ RGPD ✓" },
            { label: "Uptime", value: "99.98%" },
            { label: "Dernière mise à jour", value: "09 mai 2026" },
          ].map((item) => (
            <div key={item.label} className="info-box">
              <div className="info-label">{item.label}</div>
              <div className="info-value">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
