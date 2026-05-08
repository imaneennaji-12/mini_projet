import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import "./Layout.css";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`app-layout ${collapsed ? "collapsed" : ""}`}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        closeSidebar={() => setMobileOpen(false)}
      />

      {/* Le div.topbar est géré par Layout.css, pas Topbar.css */}
      <div className="topbar">
        <Topbar openSidebar={() => setMobileOpen(true)} />
      </div>

      <main className="app-main">
        <div className="app-page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
