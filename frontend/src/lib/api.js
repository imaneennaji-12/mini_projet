const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem("fs_token");
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("fs_token");
    localStorage.removeItem("fs_user");
    window.location.href = "/";
    throw new Error("Session expirée");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erreur serveur" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: (endpoint) => fetchWithAuth(endpoint),
  post: (endpoint, body) =>
    fetchWithAuth(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint, body) =>
    fetchWithAuth(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  patch: (endpoint, body) =>
    fetchWithAuth(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (endpoint) => fetchWithAuth(endpoint, { method: "DELETE" }),
};
