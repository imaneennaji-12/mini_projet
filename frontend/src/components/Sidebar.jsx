import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Search,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next"; // ← AJOUT
import "./Sidebar.css";

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  closeSidebar,
}) {
  const { t } = useTranslation(); // ← AJOUT
  const { user, logout } = useAuth();

  const displayName =
    user?.prenom && user?.nom
      ? `${user.prenom} ${user.nom}`
      : user?.nom || "Utilisateur";

  const navItems = [
    {
      path: "/dashboard",
      label: t("sidebar.dashboard"),
      icon: LayoutDashboard,
    },
    {
      path: "/transactions",
      label: t("sidebar.transactions"),
      icon: ArrowLeftRight,
    },
    {
      path: "/investigations",
      label: t("sidebar.investigations"),
      icon: Search,
    },
    { path: "/statistics", label: t("sidebar.statistics"), icon: BarChart3 },
    { path: "/settings", label: t("sidebar.settings"), icon: Settings },
  ];

  return (
    <>
      {/* Backdrop mobile */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? "show" : ""}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside
        className={`sidebar
          ${collapsed ? "collapsed" : ""}
          ${mobileOpen ? "open" : ""}
        `}
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Shield size={22} />
          </div>
          <div className="brand-text">
            <span className="brand-name">AnalyseTransaction </span>
            <span className="brand-tag">IA</span>
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
                title={item.label}
                onClick={closeSidebar}
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

        {/* Footer */}
        <div className="sidebar-footer">
          {/* User */}
          <div className="user-mini">
            <div className="user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{displayName}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>

          {/* Logout */}
          <button
            className="logout-btn"
            onClick={logout}
            title={t("sidebar.logout")}
          >
            <LogOut size={18} />
            <span>{t("sidebar.logout")}</span>
          </button>

          {/* Collapse — desktop seulement */}
          <button
            className="sidebar-collapse-btn"
            onClick={onToggle}
            title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
}
