import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { api } from "./lib/api";
import i18n from "./i18n"; // ← AJOUTÉ

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboord from "./pages/Dashboord";
import TransactionsPage from "./pages/TransactionsPage";
import InvestigationsPage from "./pages/InvestigationsPage";
import StatisticsPage from "./pages/StatisticsPage";
import SettingsPage from "./pages/SettingsPage";

/* ══════════════════════════════════════════════
   PROTECTION DE ROUTE
══════════════════════════════════════════════ */
function ProtectedRoute({ children }) {
  const { isAuth } = useAuth();
  if (!isAuth) return <Navigate to="/" replace />;
  return children;
}

/* ══════════════════════════════════════════════
   SYNCHRONISATION THEME / LANGUE DEPUIS BDD
══════════════════════════════════════════════ */
function ThemeSync() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    // Si localStorage existe déjà, main.jsx s'en est occupé
    const hasLocal = localStorage.getItem("fs_prefs");
    if (hasLocal) return;

    // Sinon on récupère depuis la BDD
    api
      .get("/user/profile")
      .then((data) => {
        const darkMode = data.darkMode ?? false;
        const language = data.language ?? "fr";

        document.documentElement.classList.toggle("dark", darkMode);
        document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

        // ← AJOUT : synchroniser i18n avec la langue de la BDD
        i18n.changeLanguage(language);

        localStorage.setItem(
          "fs_prefs",
          JSON.stringify({
            display: { darkMode, language },
          }),
        );
      })
      .catch(() => {
        /* silencieux */
      });
  }, [token]);

  return null;
}

/* ══════════════════════════════════════════════
   APP
══════════════════════════════════════════════ */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeSync />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />

          {/* Protégées */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboord />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/investigations" element={<InvestigationsPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
