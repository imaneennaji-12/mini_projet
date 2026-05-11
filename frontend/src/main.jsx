import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import i18n from "./i18n"; // ← importer i18n
import "./index.css";

const applyStoredPrefs = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("fs_prefs") || "{}");

    // ── Dark mode ──
    if (saved.display?.darkMode) {
      document.documentElement.classList.add("dark");
    }

    // ── Langue ──
    const lang = saved.display?.language;
    if (lang && ["fr", "en", "ar"].includes(lang)) {
      i18n.changeLanguage(lang);
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  } catch {}
};

applyStoredPrefs();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
