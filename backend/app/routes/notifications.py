from flask import Blueprint, jsonify
from app.models import Transaction   # adapte selon ton projet

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/api/notifications", methods=["GET"])
def get_notifications():

    transactions = Transaction.query.filter(
        Transaction.statut == "En attente",Transaction.prediction == 1
    ).order_by(Transaction.date_transaction.desc()).all()

    data = []

    for t in transactions:
        data.append({
            "id": t.id_transaction,
            "montant": t.montant,
            "city": t.city,
            "risk_score": t.risk_score,
            "date": t.date_transaction.strftime("%Y-%m-%d %H:%M")
        })

    return jsonify(data)