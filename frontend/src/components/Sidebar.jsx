import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Search,
  BarChart3,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { path: "/investigations", label: "Investigations", icon: Search },
  { path: "/statistics", label: "Statistiques", icon: BarChart3 },
  { path: "/settings", label: "Paramètres", icon: Settings },
];

export default function Sidebar() {
  const user = JSON.parse(localStorage.getItem("fs_user") || "{}");

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Shield size={24} />
        </div>
        <div className="brand-text">
          <span className="brand-name">FraudShield</span>
          <span className="brand-tag">Pro</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User mini-profile */}
      <div className="sidebar-footer">
        <div className="user-mini">
          <div className="user-avatar">
            {user.nom?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="user-info">
            <span className="user-name">
              {user.prenom} {user.nom}
            </span>
            <span className="user-role">
              {user.role === "banker" ? "Banquier" : "Analyste"}
            </span>
          </div>
        </div>
        <button
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem("fs_token");
            localStorage.removeItem("fs_user");
            window.location.href = "/";
          }}
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
