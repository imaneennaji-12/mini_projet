from datetime import datetime, timedelta
from flask import Blueprint, jsonify
from sqlalchemy import func
from app.routes import Dashboard_bp
from app.utils.token import token_required, role_required
from app.models import Investigation, Transaction, FraudeDetectee, db, DecisionHumaine


@Dashboard_bp.route("/stats", methods=["GET"])
@role_required("admin", "analyst", "viewer")
@token_required
def stats():
    # 📦 Total transactions
    total_transactions = Transaction.query.count()

    # 🚨 Fraudes détectées
    fraud_detected = Transaction.query.filter_by(prediction=1).count()

    # 💀 Montant risqué (fraudes uniquement)
    risk_amount = (
        db.session.query(db.func.sum(Transaction.montant))
        .filter_by(prediction=1)
        .scalar() or 0
    )

    # 🛡 Taux de sécurité (transactions non-frauduleuses)
    validation_rate = 0
    if total_transactions > 0:
        validation_rate = round(
            ((total_transactions - fraud_detected) / total_transactions) * 100, 2
        )

    # Taux de refus humain
    refused = DecisionHumaine.query.filter_by(decision="refusé").count()
    total_decisions = DecisionHumaine.query.count()
    refusal_rate = round((refused / total_decisions) * 100, 2) if total_decisions > 0 else 0

    # Investigations ouvertes
    open_investigations = Investigation.query.filter_by(statut_inv="en_attente").count()

    # Score de risque moyen (TOUTES transactions — change si tu veux fraudes uniquement)
    avg_risk_score = db.session.query(db.func.avg(Transaction.risk_score)).scalar() or 0
    avg_risk_score = round(avg_risk_score, 2)

    # Total alertes
    total_alerts = FraudeDetectee.query.count()

    # Transactions en attente ET frauduleuses
    pending_transactions = Transaction.query.filter(
        Transaction.statut == "En attente",
        Transaction.prediction == 1
    ).count()

    # ═══════════════════════════════════════════
    # STATISTIQUES PAR JOUR (7 derniers jours)
    # ═══════════════════════════════════════════
    today = datetime.utcnow().date()
    days_fr = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

    daily_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())

        legit_count = Transaction.query.filter(
            Transaction.date_transaction.between(day_start, day_end),
            Transaction.prediction == 0
        ).count()

        fraud_count = Transaction.query.filter(
            Transaction.date_transaction.between(day_start, day_end),
            Transaction.prediction == 1
        ).count()

        validated = DecisionHumaine.query.filter(
            DecisionHumaine.date_decision.between(day_start, day_end),
            DecisionHumaine.decision == "approuvé"
        ).count()

        refused_day = DecisionHumaine.query.filter(
            DecisionHumaine.date_decision.between(day_start, day_end),
            DecisionHumaine.decision == "refusé"
        ).count()

        daily_data.append({
            "day": days_fr[day.weekday()],
            "transactions_legitimes": legit_count,
            "fraudes": fraud_count,
            "validees": validated,
            "refusees": refused_day,
        })

    # ═══════════════════════════════════════════
    # RÉPARTITION PAR NIVEAU DE RISQUE
    # ═══════════════════════════════════════════
    risk_levels = db.session.query(
        Transaction.risk_level,
        func.count(Transaction.id_transaction)
    ).group_by(Transaction.risk_level).all()

    color_map = {
        "élevé": "#ef4444",
        "moyen": "#f59e0b",
        "faible": "#10b981",
    }
    risk_distribution = [
        {
            "name": level.capitalize() if level else "Inconnu",
            "value": count,
            "color": color_map.get((level or "").lower(), "#94a3b8"),
        }
        for level, count in risk_levels
    ]

    # ═══════════════════════════════════════════
    # FRAUDES PAR CATÉGORIE DE MARCHAND
    # ═══════════════════════════════════════════
    category_frauds = db.session.query(
        Transaction.merchant_category,
        func.count(Transaction.id_transaction)
    ).filter(
        Transaction.prediction == 1,
        Transaction.merchant_category.isnot(None)
    ).group_by(Transaction.merchant_category).order_by(
        func.count(Transaction.id_transaction).desc()
    ).limit(6).all()

    fraud_by_category = [
        {"category": cat or "Autres", "count": cnt}
        for cat, cnt in category_frauds
    ]

    # ═══════════════════════════════════════════
    # RÉPONSE JSON
    # ═══════════════════════════════════════════
    return jsonify({
        "totalTransactions": total_transactions,
        "fraudDetected": fraud_detected,
        "riskAmount": risk_amount,
        "validationRate": validation_rate,
        "refusalRate": refusal_rate,
        "openInvestigations": open_investigations,
        "avgRiskScore": avg_risk_score,
        "totalAlerts": total_alerts,
        "pendingTransactions": pending_transactions,
        "dailyData": daily_data,
        "riskDistribution": risk_distribution,
        "fraudByCategory": fraud_by_category,
    })