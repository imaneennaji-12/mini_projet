from datetime import datetime, timedelta
from flask import Blueprint, jsonify
from sqlalchemy import func
from app.models import Investigation, Transaction, FraudeDetectee, db, DecisionHumaine
from app.utils.token import token_required, role_required

statistics_bp = Blueprint("statistics", __name__)

@statistics_bp.route("/stats/advanced", methods=["GET"])
@token_required
@role_required("admin", "analyst")
def stats_advanced():

    today    = datetime.utcnow().date()
    days_fr  = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

    # ── KPIs principaux ──────────────────────────────────────
    total_tx     = Transaction.query.count()
    fraud_count  = Transaction.query.filter_by(prediction=1).count()
    risk_amount  = db.session.query(func.sum(Transaction.montant)).filter_by(prediction=1).scalar() or 0
    validation_rate = round(((total_tx - fraud_count) / total_tx * 100), 2) if total_tx else 0
    avg_risk     = round(db.session.query(func.avg(Transaction.risk_score)).scalar() or 0, 2)
    open_inv     = Investigation.query.filter_by(statut_inv="en_attente").count()
    total_alerts = FraudeDetectee.query.count()

    refused      = DecisionHumaine.query.filter_by(decision="refusé").count()
    total_dec    = DecisionHumaine.query.count()
    refusal_rate = round((refused / total_dec * 100), 2) if total_dec else 0

    # ── Fraudes par heure ────────────────────────────────────
    fraud_by_hour = db.session.query(
        Transaction.transaction_hour,
        func.count(Transaction.id_transaction)
    ).filter(
        Transaction.prediction == 1,
        Transaction.transaction_hour.isnot(None)
    ).group_by(Transaction.transaction_hour).order_by(Transaction.transaction_hour).all()

    fraud_hour_data = [{"hour": h, "fraudes": c} for h, c in fraud_by_hour]

    # ── Scatter : montant vs risk_score ──────────────────────
    scatter_rows = db.session.query(
        Transaction.montant,
        Transaction.risk_score,
        Transaction.prediction
    ).filter(
        Transaction.risk_score.isnot(None)
    ).order_by(Transaction.id_transaction.desc()).limit(300).all()

    scatter_data = [
        {"montant": round(m, 2), "risk_score": round(r * 100, 2), "fraud": p}
        for m, r, p in scatter_rows
    ]

    # ── Top 8 villes frauduleuses ────────────────────────────
    top_cities = db.session.query(
        Transaction.city,
        func.count(Transaction.id_transaction)
    ).filter(
        Transaction.prediction == 1,
        Transaction.city.isnot(None)
    ).group_by(Transaction.city).order_by(
        func.count(Transaction.id_transaction).desc()
    ).limit(8).all()

    city_fraud_data = [{"city": c, "fraudes": n} for c, n in top_cities]

    # ── Montant frauduleux cumulé par jour ───────────────────
    amount_by_day = []
    for i in range(6, -1, -1):
        day       = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end   = datetime.combine(day, datetime.max.time())
        total     = db.session.query(func.sum(Transaction.montant)).filter(
            Transaction.date_transaction.between(day_start, day_end),
            Transaction.prediction == 1
        ).scalar() or 0
        amount_by_day.append({
            "day":    days_fr[day.weekday()],
            "montant": round(total, 2)
        })

    # ── Fraudes par merchant_category (donut) ────────────────
    merchant_colors = ["#ef4444", "#f59e0b", "#8b5cf6", "#3b82f6", "#10b981", "#94a3b8"]
    fraud_by_merchant = db.session.query(
        Transaction.merchant_category,
        func.count(Transaction.id_transaction)
    ).filter(
        Transaction.prediction == 1,
        Transaction.merchant_category.isnot(None)
    ).group_by(Transaction.merchant_category).order_by(
        func.count(Transaction.id_transaction).desc()
    ).limit(6).all()

    fraud_type_data = [
        {"name": cat, "value": cnt, "color": merchant_colors[i % len(merchant_colors)]}
        for i, (cat, cnt) in enumerate(fraud_by_merchant)
    ]

    # ── Décisions humaines par jour ──────────────────────────
    decisions_by_day = []
    for i in range(6, -1, -1):
        day       = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end   = datetime.combine(day, datetime.max.time())
        approved  = DecisionHumaine.query.filter(
            DecisionHumaine.date_decision.between(day_start, day_end),
            DecisionHumaine.decision == "approuvé"
        ).count()
        refused_d = DecisionHumaine.query.filter(
            DecisionHumaine.date_decision.between(day_start, day_end),
            DecisionHumaine.decision == "refusé"
        ).count()
        decisions_by_day.append({
            "day":      days_fr[day.weekday()],
            "approuve": approved,
            "refuse":   refused_d,
        })

    return jsonify({
        # KPIs
        "totalTransactions": total_tx,
        "fraudDetected":     fraud_count,
        "riskAmount":        risk_amount,
        "validationRate":    validation_rate,
        "avgRiskScore":      avg_risk,
        "openInvestigations": open_inv,
        "totalAlerts":       total_alerts,
        "refusalRate":       refusal_rate,
        # Graphiques
        "fraudHourData":   fraud_hour_data,
        "scatterData":     scatter_data,
        "cityFraudData":   city_fraud_data,
        "amountByDay":     amount_by_day,
        "fraudTypeData":   fraud_type_data,
        "decisionsByDay":  decisions_by_day,
    })