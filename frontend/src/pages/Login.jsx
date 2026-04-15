import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res  = await fetch("http://127.0.0.1:5000/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Email ou mot de passe incorrect.");
        return;
      }

      localStorage.setItem("fs_token", data.token);
      navigate("/");

    } catch {
      setError("Serveur inaccessible. Vérifiez que Flask tourne.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"sans-serif" }}>

      {/* Gauche */}
      <div style={{ width:"50%", background:"#0f172a", color:"#fff", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"48px" }}>
        <div style={{ fontSize:"20px", fontWeight:"700" }}>🛡️ FraudShield Pro</div>
        <div>
          <h1 style={{ fontSize:"36px", fontWeight:"800", marginBottom:"16px" }}>
            Protégez vos clients<br />
            <span style={{ color:"#3b82f6" }}>en temps réel.</span>
          </h1>
          <p style={{ color:"#94a3b8", fontSize:"16px", lineHeight:"1.6" }}>
            Plateforme de détection de fraude bancaire alimentée par l'IA.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"24px", marginTop:"32px" }}>
            {[{ label:"Précision", value:"99.3%" }, { label:"Fraudes bloquées", value:"43/sem" }, { label:"Économies", value:"387K€" }].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize:"24px", fontWeight:"700", color:"#3b82f6" }}>{s.value}</div>
                <div style={{ fontSize:"13px", color:"#64748b" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize:"13px", color:"#475569" }}>© 2025 FraudShield Pro</p>
      </div>

      {/* Droite */}
      <div style={{ width:"50%", background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", padding:"48px" }}>
        <div style={{ width:"100%", maxWidth:"400px" }}>
          <h2 style={{ fontSize:"26px", fontWeight:"700", marginBottom:"6px" }}>Connexion sécurisée</h2>
          <p style={{ color:"#64748b", marginBottom:"32px" }}>Accès réservé au personnel autorisé</p>

          <form onSubmit={handleLogin}>

            <div style={{ marginBottom:"20px" }}>
              <label style={{ display:"block", fontSize:"14px", fontWeight:"500", marginBottom:"6px" }}>Adresse email</label>
              <input
                type="email"
                placeholder="votre@banque.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width:"100%", padding:"11px 14px", fontSize:"14px", border:"1px solid #d1d5db", borderRadius:"8px", outline:"none", boxSizing:"border-box" }}
              />
            </div>

            <div style={{ marginBottom:"20px" }}>
              <label style={{ display:"block", fontSize:"14px", fontWeight:"500", marginBottom:"6px" }}>Mot de passe</label>
              <div style={{ position:"relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width:"100%", padding:"11px 14px", fontSize:"14px", border:"1px solid #d1d5db", borderRadius:"8px", outline:"none", boxSizing:"border-box" }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:"16px" }}>
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px", padding:"12px", fontSize:"14px", color:"#dc2626", marginBottom:"16px" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"13px", background: loading ? "#93c5fd" : "#3b82f6", color:"#fff", border:"none", borderRadius:"8px", fontSize:"15px", fontWeight:"600", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Connexion en cours…" : "Se connecter"}
            </button>

          </form>

          <div style={{ marginTop:"24px", paddingTop:"20px", borderTop:"1px solid #e5e7eb", fontSize:"12px", color:"#9ca3af", textAlign:"center" }}>
            🔒 TLS 1.3 · JWT HS256 · Accès journalisé
          </div>
        </div>
      </div>
    </div>
  );
}
