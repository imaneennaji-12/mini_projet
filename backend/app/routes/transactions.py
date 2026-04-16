
from flask import request, jsonify
from app.routes import routes_bp
from app.services.ml_service import predict_transaction
from http import client
from app.models import Transaction, Client
from app import db
from datetime import datetime


@routes_bp.route("/transactions/analyze", methods=["POST"])
def analyze_transaction():
    data = request.get_json()
    result = predict_transaction(data)
     # 3. générer signaux d'alerte
    alert_signals = []

    if data["transaction_hour"] <= 5:
        alert_signals.append("Heure inhabituelle")

    if data["foreign_transaction"] == 1:
        alert_signals.append("Transaction étrangère")

    if data["location_mismatch"] == 1:
        alert_signals.append("Localisation incohérente")

    if data["amount"] > 3000:
        alert_signals.append("Montant atypique")

    if data["device_trust_score"] < 0.3:
        alert_signals.append("Nouveau dispositif")
    risk_score = result["risk_score"]

    if risk_score >= 0.8:
       risk_level = "Élevé"
    elif risk_score >= 0.5:
       risk_level = "Moyen"
    else:
       risk_level = "Faible"
      # 4. créer transaction
    transaction = Transaction(

        id_client=client.id_client,

        transaction_id=data["transaction_id"],
        montant=data["amount"],
        transaction_hour=data["transaction_hour"],

        device_trust_score=data["device_trust_score"],
        velocity_last_24h=data["velocity_last_24h"],
        cardholder_age=data["cardholder_age"],
        foreign_transaction=data["foreign_transaction"],
        location_mismatch=data["location_mismatch"],
        merchant_category=data["merchant_category"],
         city=client.ville,
        country=client.pays,

        prediction=result["prediction"],
        risk_score=result["risk_score"],
        risk_level=risk_level,
        statut=result["status"],

        alert_signals=", ".join(alert_signals),

        date_transaction=datetime.utcnow()
    )
     # 5. sauvegarder DB
    db.session.add(transaction)
    db.session.commit()
    return jsonify(result), 200
@routes_bp.route("/transactions", methods=["GET"])
def get_transactions():
    transactions = Transaction.query.all()

    result = []
    for t in transactions:
        result.append({
            "id_transaction": t.id_transaction,
            "id_client": t.id_client,
            "montant": t.montant,
            "devise": t.devise,
            "type_transaction": t.type_transaction,
            "localisation": t.localisation,
            "date_transaction": t.date_transaction.strftime("%Y-%m-%d %H:%M:%S") if t.date_transaction else None,
            "statut": t.statut
        })
    return jsonify(result), 200