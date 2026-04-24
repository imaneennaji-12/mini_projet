
from flask import request, jsonify
from app.routes import routes_bp
from app.services.ml_service import predict_transaction
from app.models import Transaction, Client
from app import db
from datetime import datetime
from flask import request, jsonify
from app.routes import routes_bp
from app.models import db, Transaction, DecisionHumaine


@routes_bp.route("/transactions/analyze", methods=["POST"])
def analyze_transaction():
    data = request.get_json()

    result = predict_transaction(data)

    client = Client.query.get(data["id_client"])
    client_id = data["id_client"]
    if not client:
        return jsonify({"error": "Client introuvable"}), 404

    alert_signals = []

    if data["transaction_hour"] <= 4:
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

    transaction = Transaction(
        id_transaction=data["id_transaction"],
        id_client=client.id_client,
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

    db.session.add(transaction)
    db.session.commit()

    return jsonify(result), 200
@routes_bp.route("/transactions", methods=["GET"])
def get_transactions():
    transactions = Transaction.query.all()

    result = []
    for t in transactions:
        client = t.client

        result.append({
            "id_transaction": t.id_transaction,
            "id_client": t.id_client,

            "client_nom_complet": f"{client.nom} {client.prenom}" if client else None,
            "client_nom": client.nom if client else None,
            "client_prenom": client.prenom if client else None,
            "client_email": client.email if client else None,
            "client_telephone": client.telephone if client else None,
            "client_ville": client.ville if client else None,
            "client_pays": client.pays if client else None,
            "client_date_creation": client.date_creation.strftime("%Y-%m-%d %H:%M:%S") if client and client.date_creation else None,
            "montant": t.montant,
            "transaction_hour": t.transaction_hour,
            "date_transaction": t.date_transaction.strftime("%Y-%m-%d %H:%M:%S") if t.date_transaction else None,
            "city": t.city,
            "country": t.country,
            "device_trust_score": t.device_trust_score,
            "velocity_last_24h": t.velocity_last_24h,
            "cardholder_age": t.cardholder_age,
            "foreign_transaction": t.foreign_transaction,
            "location_mismatch": t.location_mismatch,
            "merchant_category": t.merchant_category,
            "prediction": t.prediction,
            "risk_score": t.risk_score,
            "risk_level": t.risk_level,
            "statut": t.statut,
            "alert_signals": t.alert_signals
        })

    return jsonify(result), 200


@routes_bp.route("/transactions/<int:id_transaction>/validate", methods=["POST"])
def validate_transaction(id_transaction):
    data = request.get_json()

    transaction = Transaction.query.get(id_transaction)
    if not transaction:
        return jsonify({"error": "Transaction introuvable"}), 404

    id_user  = data.get("id_user")
    commentaire = data.get("commentaire", "")

    if not id_user:
        return jsonify({"error": "id_user est obligatoire"}), 400

    # changer le statut de la transaction
    transaction.statut = "Validée"

    # créer la décision humaine
    decision = DecisionHumaine(
        id_transaction=transaction.id_transaction,
        id_user=id_user,
        decision="approuvé",
        commentaire=commentaire
    )

    db.session.add(decision)
    db.session.commit()

    return jsonify({
        "message": "Transaction validée avec succès",
        "id_transaction": transaction.id_transaction,
        "statut": transaction.statut,
        "decision": decision.decision
    }), 200
@routes_bp.route("/transactions/<int:id_transaction>/refuse", methods=["POST"])
def refuse_transaction(id_transaction):
    data = request.get_json()

    transaction = Transaction.query.get(id_transaction)
    if not transaction:
        return jsonify({"error": "Transaction introuvable"}), 404

    id_user = data.get("id_user")
    commentaire = data.get("commentaire", "")

    if not id_user:
        return jsonify({"error": "id_user est obligatoire"}), 400

    transaction.statut = "Refusée"

    decision = DecisionHumaine(
        id_transaction=transaction.id_transaction,
        id_user=id_user,
        decision="refusé",
        commentaire=commentaire
    )

    db.session.add(decision)
    db.session.commit()

    return jsonify({
        "message": "Transaction refusée avec succès",
        "id_transaction": transaction.id_transaction,
        "statut": transaction.statut,
        "decision": decision.decision
    }), 200