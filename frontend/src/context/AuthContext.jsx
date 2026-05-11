import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("fs_token");
    const u = localStorage.getItem("fs_user");
    if (t) setToken(t);
    if (u) {
      try {
        const parsedUser = JSON.parse(u);
        setUser(parsedUser);
        // ═══ Appliquer le thème stocké dans l'utilisateur ═══
        if (parsedUser.darkMode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch {
        /* ignore */
      }
    } else if (t) {
      // fallback : parser depuis le JWT
      const payload = parseJwt(t);
      if (payload.email || payload.nom) {
        const derived = {
          nom: payload.nom || payload.email?.split("@")[0] || "Utilisateur",
          prenom: payload.prenom || "",
          email: payload.email || "",
          role: payload.role || "analyste",
          darkMode: payload.dark_mode ?? false,
          language: payload.language || "fr",
        };
        setUser(derived);
        localStorage.setItem("fs_user", JSON.stringify(derived));
        // ═══ Appliquer le thème du JWT ═══
        if (derived.darkMode) {
          document.documentElement.classList.add("dark");
        }
      }
    }
    setReady(true);
  }, []);

  const login = useCallback((newToken, userData) => {
    // ═══ Appliquer le thème immédiatement au login ═══
    if (userData.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    localStorage.setItem("fs_token", newToken);
    localStorage.setItem("fs_user", JSON.stringify(userData));

    // ═══ Sauvegarder aussi dans fs_prefs pour le chargement initial rapide ═══
    try {
      const prev = JSON.parse(localStorage.getItem("fs_prefs") || "{}");
      localStorage.setItem(
        "fs_prefs",
        JSON.stringify({
          ...prev,
          display: {
            darkMode: userData.darkMode ?? false,
            language: userData.language ?? "fr",
          },
        }),
      );
    } catch {}

    setToken(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("fs_token");
    localStorage.removeItem("fs_user");
    // ═══ Optionnel : garder ou retirer le thème au logout ═══
    // document.documentElement.classList.remove("dark");
    setToken(null);
    setUser(null);
    window.location.href = "/";
  }, []);

  if (!ready) return null;

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuth: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
