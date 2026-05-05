import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboord";
import TransactionsPage from "./pages/TransactionsPage";
import InvestigationsPage from "./pages/InvestigationsPage";
import StatisticsPage from "./pages/StatisticsPage";
import SettingsPage from "./pages/SettingsPage";
import "./App.css";

// Guard pour routes protégées
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("fs_token");
  if (!token) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login (public) */}
        <Route path="/" element={<Login />} />

        {/* Routes protégées avec Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/investigations" element={<InvestigationsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
