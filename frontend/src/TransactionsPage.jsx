import React, { useEffect, useState } from "react";

function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/transactions")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des transactions");
        }
        return response.json();
      })
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Chargement...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Liste des transactions</h1>

      <table border="1" cellPadding="10" cellSpacing="0" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>ID Client</th>
            <th>Montant</th>
            <th>Devise</th>
            <th>Type</th>
            <th>Localisation</th>
            <th>Date</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length > 0 ? (
            transactions.map((t) => (
              <tr key={t.id_transaction}>
                <td>{t.id_transaction}</td>
                <td>{t.id_client}</td>
                <td>{t.montant}</td>
                <td>{t.devise}</td>
                <td>{t.type_transaction}</td>
                <td>{t.localisation}</td>
                <td>{t.date_transaction}</td>
                <td>{t.statut}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8">Aucune transaction trouvée</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TransactionsPage;