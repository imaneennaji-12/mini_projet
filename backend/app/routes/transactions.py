
from flask import request, jsonify
from flask import request, jsonify
from datetime import datetime, timedelta

from app.routes import routes_bp
from app.services.ml_service import predict_transaction
from app.services.email_service import send_investigation_email
from app.models import (
    db,
    Transaction,
    Client,
    DecisionHumaine,
    Investigation,
    NotificationClient
)


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

@routes_bp.route("/transactions/<int:id_transaction>/investigate", methods=["POST"])
def investigate_transaction(id_transaction):
    data = request.get_json()

    transaction = Transaction.query.get(id_transaction)
    if not transaction:
        return jsonify({"error": "Transaction introuvable"}), 404

    client = transaction.client
    if not client:
        return jsonify({"error": "Client introuvable"}), 404

    subject = data.get("subject", "Confirmation de transaction suspecte")
    message = data.get("message", "")

    transaction.statut = "Investigation"

    investigation = Investigation(
        id_transaction=transaction.id_transaction,
        id_client=client.id_client,
        token_expiry=datetime.utcnow() + timedelta(hours=24),
        statut_inv="en_attente"
    )

    db.session.add(investigation)
    db.session.flush()

    lien_oui = f"http://127.0.0.1:5000/api/client-response/{investigation.token}/oui"
    lien_non = f"http://127.0.0.1:5000/api/client-response/{investigation.token}/non"

    html_body = f"""
<p>Bonjour {client.nom},</p>

<p>{message}</p>

<hr>

<p><strong>Détails de la transaction :</strong></p>
<ul>
    <li>Référence : {transaction.id_transaction}</li>
    <li>Montant : {transaction.montant} EUR</li>
    <li>Catégorie : {transaction.merchant_category}</li>
    <li>Localisation : {transaction.city}, {transaction.country}</li>
    <li>Date : {transaction.date_transaction}</li>
</ul>

<p>Veuillez confirmer :</p>

<table role="presentation" cellspacing="0" cellpadding="0">
<tr>
<td style="padding:10px;">
    <a href="{lien_oui}"
       style="
       background-color:#16a34a;
       color:white;
       padding:12px 20px;
       text-decoration:none;
       border-radius:8px;
       display:inline-block;
       font-weight:bold;
       font-family:Arial;
       ">
       ✅ Oui, c'est moi
    </a>
</td>

<td style="padding:10px;">
    <a href="{lien_non}"
       style="
       background-color:#dc2626;
       color:white;
       padding:12px 20px;
       text-decoration:none;
       border-radius:8px;
       display:inline-block;
       font-weight:bold;
       font-family:Arial;
       ">
       ❌ Non, fraude
    </a>
</td>
</tr>
</table>

<p style="margin-top:20px;">
⏳ Ce lien expire dans 24 heures.
</p>

<p>
Cordialement,<br>
Service sécurité bancaire
</p>
"""
    send_investigation_email(client.email, subject, html_body)

    notification = NotificationClient(
        id_client=client.id_client,
        id_transaction=transaction.id_transaction,
        type_notif="investigation",
        canal="email",
        statut_envoi="envoyé"
    )

    db.session.add(notification)
    db.session.commit()

    return jsonify({
        "message": "Investigation créée et email envoyé",
        "statut": transaction.statut,
        "email": client.email
    }), 200
@routes_bp.route("/client-response/<token>/<reponse>", methods=["GET"])
def client_response(token, reponse):
    investigation = Investigation.query.filter_by(token=token).first()

    if not investigation:
        return "Lien invalide", 404

    if investigation.token_expiry and investigation.token_expiry < datetime.utcnow():
        investigation.statut_inv = "expiré"
        db.session.commit()
        return "Lien expiré", 400

    if reponse not in ["oui", "non"]:
        return "Réponse invalide", 400
    if investigation.reponse_client is not None:
        return "Réponse déjà enregistrée", 200

    investigation.reponse_client = reponse
    investigation.date_reponse = datetime.utcnow()

    if reponse == "oui":
        investigation.statut_inv = "confirmé_client"
        investigation.transaction.statut = "Validée"
    else:
        investigation.statut_inv = "refusé_client"
        investigation.transaction.statut = "Refusée"

    db.session.commit()

    return """
    <h2>Merci pour votre réponse</h2>
    <p>Votre réponse a bien été enregistrée.</p>
    """