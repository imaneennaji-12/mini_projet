from flask import Blueprint, jsonify
from app.models import Transaction, FraudeDetectee, db

dashboard = Blueprint("dashboard", __name__)

@dashboard.route("/stats", methods=["GET"])
def stats():

    # 📦 Total transactions
    total_transactions = Transaction.query.count()

    # 🚨 Fraudes détectées
    fraud_detected = FraudeDetectee.query.filter_by(prediction=1).count()

    # 💀 Montant risqué (fraudes)
    risk_amount = db.session.query(
        db.func.sum(Transaction.montant)
    ).join(FraudeDetectee)\
     .filter(FraudeDetectee.prediction == 1)\
     .scalar()

    if risk_amount is None:
        risk_amount = 0

    # 🛡 Taux de sécurité
    validation_rate = 0
    if total_transactions > 0:
        validation_rate = round(
            ((total_transactions - fraud_detected) / total_transactions) * 100,
            2
        )

    return jsonify({
        "totalTransactions": total_transactions,
        "fraudDetected": fraud_detected,
        "riskAmount": risk_amount,
        "validationRate": validation_rate
    })