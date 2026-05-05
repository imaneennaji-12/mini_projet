import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./Layout.css";

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
