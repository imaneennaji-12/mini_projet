import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Email ou mot de passe incorrect.");
        return;
      }

      localStorage.setItem("fs_token", data.token);
      navigate("/dashboard");
    } catch {
      setError("Serveur inaccessible. Vérifiez que Flask tourne.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "sans-serif",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      {/* ===== GAUCHE ===== */}
      <div
        style={{
          width: isMobile ? "100%" : "50%",
          background:
            "linear-gradient(135deg, hsl(222, 47%, 11%) 0%, hsl(214, 55%, 22%) 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: isMobile ? "center" : "space-between",
          padding: isMobile ? "32px 24px" : "48px",
          alignItems: "flex-start",
          borderTopRightRadius: isMobile ? "0" : "40px",
          borderBottomRightRadius: isMobile ? "0" : "40px",
          borderBottomLeftRadius: isMobile ? "40px" : "0",
          gap: isMobile ? "20px" : "0",
        }}
      >
        <div
          style={{ fontSize: isMobile ? "16px" : "20px", fontWeight: "700" }}
        >
          🛡️ AnalyseTransaction IA
        </div>

        <div>
          <h1
            style={{
              color: "#ebeef2",
              fontSize: isMobile ? "24px" : "36px",
              fontWeight: "800",
              marginBottom: "16px",
              lineHeight: "1.2",
            }}
          >
            Protégez vos clients
            <br />
            <span style={{ color: "#f3f5f7" }}>en temps réel.</span>
          </h1>

          <p
            style={{
              color: "#94a3b8",
              fontSize: isMobile ? "14px" : "16px",
              lineHeight: "1.6",
              textAlign: "left",
            }}
          >
            Plateforme de détection de fraude bancaire alimentée par l'IA.
            Surveillez, analysez et agissez instantanément sur chaque
            transaction suspecte.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: isMobile ? "16px" : "24px",
              marginTop: isMobile ? "20px" : "32px",
            }}
          >
            {[
              { label: "Précision", value: "93.9%" },
              { label: "Fraudes bloquées", value: "+1000" },
              { label: "Économies", value: "+1000k DH" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontSize: isMobile ? "18px" : "24px",
                    fontWeight: "700",
                    color: "#3b82f6",
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {!isMobile && (
          <p style={{ fontSize: "13px", color: "#475569" }}>
            © 2026 AnalyseTransaction IA
          </p>
        )}
      </div>

      {/* ===== DROITE ===== */}
      <div
        style={{
          width: isMobile ? "100%" : "50%",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "32px 24px" : "48px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <h2
            style={{
              fontSize: isMobile ? "22px" : "26px",
              fontWeight: "700",
              marginBottom: "6px",
            }}
          >
            Connexion sécurisée
          </h2>
          <p style={{ color: "#64748b", marginBottom: "32px" }}>
            Accès réservé au personnel autorisé
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "6px",
                }}
              >
                Adresse email
              </label>
              <input
                type="email"
                placeholder="votre@banque.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  fontSize: "14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#fff",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "6px",
                }}
              >
                Mot de passe
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    fontSize: "14px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#fff",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "14px",
                  color: "#dc2626",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                background: loading ? "#93c5fd" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {loading ? "Connexion en cours…" : "Se connecter"}
            </button>
          </form>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid #e5e7eb",
              fontSize: "12px",
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            🔒 TLS 1.3 · JWT HS256 · Accès journalisé
          </div>

          {isMobile && (
            <p
              style={{
                textAlign: "center",
                fontSize: "11px",
                color: "#cbd5e1",
                marginTop: "16px",
              }}
            >
              © 2026 AnalyseTransaction IA
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
