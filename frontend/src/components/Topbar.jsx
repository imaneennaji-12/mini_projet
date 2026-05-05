import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import "./Topbar.css";

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return {};
  }
}

function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Topbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("fs_token");
  const payload = token ? parseJwt(token) : {};

  const name = payload.username
    ? payload.username.replace(/\b\w/g, (c) => c.toUpperCase())
    : payload.email?.split("@")[0]?.replace(/\b\w/g, (c) => c.toUpperCase()) ||
      "Utilisateur";

  const role = payload.role
    ? payload.role.charAt(0).toUpperCase() + payload.role.slice(1)
    : "Analyste";

  return (
    <nav className="topbar">
      {/* LEFT: Surveillance active */}
      <div className="topbar-left">
        <span className="status-dot" />
        <span className="status-text">Surveillance active</span>
      </div>

      {/* RIGHT: Notifications + Profil + Déconnexion */}
      <div className="topbar-right">
        {/* Notification */}
        <div className="notification-wrapper">
          <Bell size={20} className="notification-icon" />
          <span className="notification-badge">3</span>
        </div>

        {/* Profil */}
        <div className="user-profile">
          <div className="user-avatar">{initials(name)}</div>
          <div className="user-info">
            <div className="user-name">{name}</div>
            <div className="user-role">{role}</div>
          </div>
        </div>

        {/* Déconnexion */}
        <button
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem("fs_token");
            localStorage.removeItem("fs_user");
            navigate("/");
          }}
        >
          DÉCONNEXION
        </button>
      </div>
    </nav>
  );
}
