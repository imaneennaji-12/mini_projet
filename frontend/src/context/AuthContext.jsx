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
        setUser(JSON.parse(u));
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
        };
        setUser(derived);
        localStorage.setItem("fs_user", JSON.stringify(derived));
      }
    }
    setReady(true);
  }, []);

  const login = useCallback((newToken, userData) => {
    localStorage.setItem("fs_token", newToken);
    localStorage.setItem("fs_user", JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("fs_token");
    localStorage.removeItem("fs_user");
    setToken(null);
    setUser(null);
    window.location.href = "/";
  }, []);

  if (!ready) return null; // ou un loader

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
