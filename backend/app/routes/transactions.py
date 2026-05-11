from flask_socketio import emit 
from flask import request, jsonify
from datetime import datetime, timedelta
from app import socketio 
from app.utils.token import token_required, role_required

from app.routes import routes_bp
from app.services.ml_service import predict_transaction
from app.services.email_service import send_investigation_email
from app.models import (
    db,
    Transaction,
    Client,
    DecisionHumaine,
    Investigation,
    FraudeDetectee,
    ThresholdHistory,  # ← AJOUTÉ
)


def get_current_thresholds():
    """Récupère les seuils actuels depuis la base de données."""
    latest = ThresholdHistory.query.order_by(
        ThresholdHistory.date_modification.desc()
    ).first()
    
    if latest:
        return {
            "risk_medium": float(latest.risk_medium),
            "risk_high": float(latest.risk_high)
        }
    # Seuils par défaut
    return {
        "risk_medium": 0.45,
        "risk_high": 0.75
    }


@routes_bp.route("/transactions/analyze", methods=["POST"])
def analyze_transaction():
    data = request.get_json()

    result = predict_transaction(data)

    client = Client.query.get(data["id_client"])
    if not client:
        return jsonify({"error": "Client introuvable"}), 404

    # ═══ RÉCUPÉRER LES SEUILS DYNAMIQUES ═══
    thresholds = get_current_thresholds()
    risk_score = result["risk_score"]

    # Comparaison avec les seuils de la base de données
    if risk_score >= thresholds["risk_high"]:
        risk_level = "Élevé"
    elif risk_score >= thresholds["risk_medium"]:
        risk_level = "Moyen"
    else:
        risk_level = "Faible"

    alert_signals = []
    
    if risk_level in ("Élevé", "Moyen"):
        if data.get("transaction_hour", 12) <= 4:
            alert_signals.append("Heure inhabituelle")
        if data.get("foreign_transaction") == 1:
            alert_signals.append("Transaction étrangère")
        if data.get("location_mismatch") == 1:
            alert_signals.append("Localisation incohérente")
        if data.get("amount", 0) > 3000:
            alert_signals.append("Montant atypique")
        if data.get("device_trust_score", 1) < 0.3:
            alert_signals.append("Nouveau dispositif")

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
        alert_signals=", ".join(alert_signals),
        date_transaction=datetime.utcnow()
    )
    
    if risk_level == "Faible":
        transaction.statut = "Validée"
    else:
        transaction.statut = "En attente"

    db.session.add(transaction)
    db.session.commit()

    # Récupérer le client frais pour la relation
    client = transaction.client

    socketio.emit("new_transaction", {
        "id_transaction": transaction.id_transaction,
        "id_client": transaction.id_client,
        "client_nom_complet": f"{client.nom} {client.prenom}" if client else None,
        "client_nom": client.nom if client else None,
        "client_prenom": client.prenom if client else None,
        "client_email": client.email if client else None,
        "client_telephone": client.telephone if client else None,
        "client_ville": client.ville if client else None,
        "client_pays": client.pays if client else None,
        "client_date_creation": client.date_creation.strftime("%Y-%m-%d %H:%M:%S") if client and client.date_creation else None,
        "montant": transaction.montant,
        "transaction_hour": transaction.transaction_hour,
        "date_transaction": transaction.date_transaction.strftime("%Y-%m-%d %H:%M:%S") if transaction.date_transaction else None,
        "city": transaction.city,
        "country": transaction.country,
        "device_trust_score": transaction.device_trust_score,
        "velocity_last_24h": transaction.velocity_last_24h,
        "cardholder_age": transaction.cardholder_age,
        "foreign_transaction": transaction.foreign_transaction,
        "location_mismatch": transaction.location_mismatch,
        "merchant_category": transaction.merchant_category,
        "prediction": transaction.prediction,
        "risk_score": transaction.risk_score,
        "risk_level": transaction.risk_level,
        "statut": transaction.statut,
        "alert_signals": transaction.alert_signals
    })

    return jsonify({
        **result,
        "risk_level": risk_level,
        "thresholds_used": thresholds  # ← Info debug
    }), 200
@routes_bp.route("/transactions", methods=["GET"])
@token_required
@role_required("admin", "analyst", "viewer")
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
@token_required
@role_required("admin", "analyst")
def validate_transaction(id_transaction):
    data = request.get_json()

    transaction = Transaction.query.get(id_transaction)
    if not transaction:
        return jsonify({"error": "Transaction introuvable"}), 404

    id_user  = request.current_user.get("user_id") 
    commentaire = data.get("commentaire", "")

    if not id_user:
        return jsonify({"error": "id_user est obligatoire"}), 400

    # changer le statut de la transaction
    transaction.statut = "Validée"
    db.session.commit()

    # créer la décision humaine
    decision = DecisionHumaine(
        id_transaction=transaction.id_transaction,
        id_user=id_user,
        decision="Validée",
        commentaire=commentaire
    )

    db.session.add(decision)
    db.session.commit()
    socketio.emit("transaction_updated", {
        "id_transaction": transaction.id_transaction,
        "statut": "Validée",
        "decision": "Validée",
        "id_user": id_user
    })

    return jsonify({
        "message": "Transaction validée avec succès",
        "id_transaction": transaction.id_transaction,
        "statut": transaction.statut,
        "decision": decision.decision
    }), 200


@routes_bp.route("/transactions/<int:id_transaction>/refuse", methods=["POST"])
@token_required
@role_required("admin", "analyst")
def refuse_transaction(id_transaction):
    data = request.get_json()

    transaction = Transaction.query.get(id_transaction)
    if not transaction:
        return jsonify({"error": "Transaction introuvable"}), 404

    id_user = request.current_user.get("user_id") 
    commentaire = data.get("commentaire", "")

    if not id_user:
        return jsonify({"error": "id_user est obligatoire"}), 400

    transaction.statut = "Refusée"

    decision = DecisionHumaine(
        id_transaction=transaction.id_transaction,
        id_user=id_user,
        decision="Refusée",
        commentaire=commentaire
    )

    db.session.add(decision)

    # ─── ✅ CRÉER FRAUDE DETECTEE (agent a confirmé la fraude) ───
    existing_fraude = FraudeDetectee.query.filter_by(
        id_transaction=transaction.id_transaction
    ).first()
    
    if not existing_fraude:
        fraude = FraudeDetectee(
            id_transaction=transaction.id_transaction,
            confirme_par_agent=True,           # ← L'agent a confirmé
            confirme_par_client=False,
            type_fraude='inconnu',
            montant_fraude=transaction.montant
        )
        db.session.add(fraude)

    # ─── ✅ ENVOYER EMAIL AU CLIENT ───
    client = transaction.client
    if client and client.email:
        subject = f"🚨 Alerte sécurité — Transaction refusée #{transaction.id_transaction}"
        
        html_body = f"""
<p>Bonjour {client.nom} {client.prenom},</p>

<p>Nous avons <strong>refusé</strong> une transaction sur votre compte pour des raisons de sécurité.</p>

<hr>

<p><strong>Détails de la transaction bloquée :</strong></p>
<ul>
    <li>Référence : {transaction.id_transaction}</li>
    <li>Montant : {transaction.montant} EUR</li>
    <li>Catégorie : {transaction.merchant_category}</li>
    <li>Localisation : {transaction.city}, {transaction.country}</li>
    <li>Date : {transaction.date_transaction}</li>
</ul>

<p><strong>Raison du refus :</strong></p>
<p style="background:#fef2f2; padding:12px; border-radius:8px; border-left:4px solid #dc2626;">
    {commentaire or "Transaction suspecte détectée par notre système de sécurité."}
</p>

<p><strong>Que faire ?</strong></p>
<ul>
    <li>Si vous reconnaissez cette transaction, contactez immédiatement notre service client.</li>
    <li>Si vous ne reconnaissez pas cette transaction, votre compte est sécurisé. Aucun débit n'a été effectué.</li>
    <li>Votre carte peut être bloquée pour votre protection. Contactez-nous pour la débloquer.</li>
</ul>

<p style="color:#dc2626; font-weight:bold;">
    ⚠️ N'ignorez pas cet email si vous n'êtes pas à l'origine de cette transaction.
</p>

<p>
Cordialement,<br>
<strong>Service sécurité bancaire</strong><br>
📞 +212 5XX-XXXXXX<br>
📧 securite@banque.com
</p>
"""
        send_investigation_email(client.email, subject, html_body)

    db.session.commit()
    socketio.emit("transaction_updated", {
        "id_transaction": transaction.id_transaction,
        "statut": "Refusée",
        "decision": "Refusée",
        "id_user": id_user
    })

    return jsonify({
        "message": "Transaction refusée avec succès — Email envoyé au client",
        "id_transaction": transaction.id_transaction,
        "statut": transaction.statut,
        "decision": decision.decision,
        "email_sent": bool(client and client.email)
    }), 200


@routes_bp.route("/transactions/<int:id_transaction>/investigate", methods=["POST"])
@token_required
@role_required("admin", "analyst")
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
        statut_inv="en_attente",
        email_envoye=True,        
        date_envoi_email=datetime.utcnow()
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
        return """
        <html>
        <head><meta charset="UTF-8"><style>
            body{font-family:sans-serif;text-align:center;padding:50px;color:#dc2626}
        </style></head>
        <body><h2>❌ Lien invalide</h2><p>Ce lien n'existe pas ou a été supprimé.</p></body>
        </html>
        """, 404

    if investigation.token_expiry and investigation.token_expiry < datetime.utcnow():
        investigation.statut_inv = "expiré"
        db.session.commit()
        return """
        <html>
        <head><meta charset="UTF-8"><style>
            body{font-family:sans-serif;text-align:center;padding:50px;color:#f59e0b}
        </style></head>
        <body><h2>⏰ Lien expiré</h2><p>Ce lien a expiré. Contactez votre banque.</p></body>
        </html>
        """, 400

    if reponse not in ["oui", "non"]:
        return """
        <html>
        <head><meta charset="UTF-8"><style>
            body{font-family:sans-serif;text-align:center;padding:50px;color:#dc2626}
        </style></head>
        <body><h2>❌ Réponse invalide</h2></body>
        </html>
        """, 400
        
    if investigation.reponse_client is not None:
        # Déjà répondu — afficher la page avec boutons désactivés
        deja_repondu = investigation.reponse_client == "oui"
        return f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: 'Segoe UI', Arial, sans-serif;
                    text-align: center;
                    padding: 60px 20px;
                    background: #f8fafc;
                }}
                .card {{
                    background: white;
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 40px;
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                }}
                .icon {{ font-size: 64px; margin-bottom: 20px; }}
                h2 {{ color: #1e293b; margin-bottom: 12px; }}
                p {{ color: #64748b; line-height: 1.6; }}
                .buttons {{
                    display: flex;
                    gap: 16px;
                    justify-content: center;
                    margin-top: 32px;
                }}
                .btn {{
                    padding: 14px 32px;
                    border-radius: 10px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 16px;
                    display: inline-block;
                    opacity: 0.4;
                    cursor: not-allowed;
                    pointer-events: none;
                }}
                .btn-oui {{ background: #16a34a; color: white; }}
                .btn-non {{ background: #dc2626; color: white; }}
                .badge {{
                    display: inline-block;
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 600;
                    margin-top: 16px;
                }}
                .badge-success {{ background: #dcfce7; color: #166534; }}
                .badge-danger {{ background: #fee2e2; color: #991b1b; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">{"✅" if deja_repondu else "🚨"}</div>
                <h2>Réponse déjà enregistrée</h2>
                <p>Vous avez déjà répondu <strong>{"OUI" if deja_repondu else "NON"}</strong> à cette demande.</p>
                <span class="badge {"badge-success" if deja_repondu else "badge-danger"}">
                    {"Transaction confirmée" if deja_repondu else "Fraude signalée"}
                </span>
                <div class="buttons">
                    <span class="btn btn-oui">✅ Oui, c'est moi</span>
                    <span class="btn btn-non">❌ Non, fraude</span>
                </div>
            </div>
        </body>
        </html>
        """, 200

    investigation.reponse_client = reponse
    investigation.date_reponse = datetime.utcnow()

    if reponse == "oui":
        investigation.statut_inv = "confirmé_client"
        investigation.transaction.statut = "Validée"
        icon = "✅"
        titre = "Merci pour votre confirmation"
        message = "Votre transaction a été validée avec succès."
        couleur = "#166534"
        bg = "#dcfce7"
        badge = "Transaction confirmée"
    else:
        investigation.statut_inv = "refusé_client"
        investigation.transaction.statut = "Refusée"
        
        # ─── ✅ CRÉER FRAUDE DETECTEE ───
        existing_fraude = FraudeDetectee.query.filter_by(
            id_transaction=investigation.transaction.id_transaction
        ).first()
        
        if not existing_fraude:
            fraude = FraudeDetectee(
                id_transaction=investigation.transaction.id_transaction,
                confirme_par_agent=False,
                confirme_par_client=True,
                type_fraude='inconnu',
                montant_fraude=investigation.transaction.montant
            )
            db.session.add(fraude)
        else:
            existing_fraude.confirme_par_client = True
        
        icon = "🚨"
        titre = "Fraude signalée"
        message = "Votre signalement a été enregistré. Votre compte est sécurisé et aucun débit n'a été effectué."
        couleur = "#991b1b"
        bg = "#fee2e2"
        badge = "Fraude signalée"

    db.session.commit()
    socketio.emit("investigation_resolved", {
        "id_transaction": investigation.transaction.id_transaction,
        "reponse": reponse,
        "statut_transaction": investigation.transaction.statut,
        "statut_investigation": investigation.statut_inv
    })

    # Page avec boutons désactivés après clic
    return f"""
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: 'Segoe UI', Arial, sans-serif;
                text-align: center;
                padding: 60px 20px;
                background: #f8fafc;
            }}
            .card {{
                background: white;
                max-width: 500px;
                margin: 0 auto;
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }}
            .icon {{ font-size: 64px; margin-bottom: 20px; }}
            h2 {{ color: {couleur}; margin-bottom: 12px; }}
            p {{ color: #64748b; line-height: 1.6; }}
            .badge {{
                display: inline-block;
                padding: 10px 24px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                margin-top: 20px;
                background: {bg};
                color: {couleur};
            }}
            .buttons {{
                display: flex;
                gap: 16px;
                justify-content: center;
                margin-top: 32px;
            }}
            .btn {{
                padding: 14px 32px;
                border-radius: 10px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                display: inline-block;
                opacity: 0.4;
                cursor: not-allowed;
                pointer-events: none;
                user-select: none;
            }}
            .btn-oui {{ background: #16a34a; color: white; }}
            .btn-non {{ background: #dc2626; color: white; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">{icon}</div>
            <h2>{titre}</h2>
            <p>{message}</p>
            <span class="badge">{badge}</span>
            
            <div class="buttons">
                <span class="btn btn-oui">✅ Oui, c'est moi</span>
                <span class="btn btn-non">❌ Non, fraude</span>
            </div>
        </div>
    </body>
    </html>
    """

@routes_bp.route("/investigations", methods=["GET"])
def get_investigations():
    transactions = Transaction.query.all()
    result = []

    confirmed_count = Investigation.query.filter_by(reponse_client="oui").count()

    for t in transactions:
        if t.statut == "Investigation" or (t.statut == "En attente" and t.risk_level == "Élevé"):
            client = t.client
            result.append({
                "id": t.id_transaction,
                "client": f"{client.nom} {client.prenom}" if client else "",
                "amount": t.montant,
                "currency": "EUR",
                "merchant": t.merchant_category,
                "location": f"{t.city}, {t.country}",
                "date": t.date_transaction.strftime("%Y-%m-%d"),
                "time": t.date_transaction.strftime("%H:%M:%S"),
                "riskLevel": t.risk_level.lower() if t.risk_level else "",
                "riskScore": int(t.risk_score * 100) if t.risk_score else 0,
                "status": t.statut.lower(),
                "email": client.email if client else "",
                "phone": client.telephone if client else "",
                "flags": t.alert_signals.split(",") if t.alert_signals else [],
                "deviceType": "Inconnu",
                "ipAddress": "192.168.1.1",
            })

    return jsonify({
        "transactions": result,
        "confirmedCount": confirmed_count  
    }), 200