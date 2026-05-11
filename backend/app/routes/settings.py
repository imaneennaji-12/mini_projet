from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from app.models import db, User, ThresholdHistory
from app.utils.token import token_required, role_required
from app.routes import settings_bp


# ═══════════════════════════════════════════════════════════════
# GET /user/profile
# ═══════════════════════════════════════════════════════════════
@settings_bp.route("/user/profile", methods=["GET"])
@token_required
def get_profile():
    user_id = request.current_user.get("user_id")
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    return jsonify({
        "id_user":       user.id_user,
        "nom":           user.nom        or "",
        "prenom":        user.prenom     or "",
        "email":         user.email      or "",
        "telephone":     user.telephone  or "",
        "role":          user.role       or "analyste",
        "actif":         user.actif,
        "darkMode":      user.dark_mode if user.dark_mode is not None else False,
        "language":      user.language or "fr",
        "date_creation": user.date_creation.strftime("%d/%m/%Y") if user.date_creation else "",
    }), 200


# ═══════════════════════════════════════════════════════════════
# PUT /user/profile
# ═══════════════════════════════════════════════════════════════
@settings_bp.route("/user/profile", methods=["PUT"])
@token_required
def update_profile():
    user_id = request.current_user.get("user_id")
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    data   = request.get_json() or {}  # ← DÉPLACÉ ICI (avant tout usage)
    errors = {}

    # ── nom (obligatoire) ──
    nom = data.get("nom", "").strip()
    if not nom:
        errors["nom"] = "Le nom est obligatoire"
    elif len(nom) > 100:
        errors["nom"] = "Max 100 caractères"
    else:
        user.nom = nom

    # ── prenom ──
    prenom = data.get("prenom", "").strip()
    if len(prenom) > 50:
        errors["prenom"] = "Max 50 caractères"
    else:
        user.prenom = prenom or None

    # ── email (obligatoire + unique) ──
    email = data.get("email", "").strip().lower()
    if not email or "@" not in email or "." not in email.split("@")[-1]:
        errors["email"] = "Email invalide"
    else:
        existing = User.query.filter(
            User.email == email,
            User.id_user != user_id
        ).first()
        if existing:
            errors["email"] = "Email déjà utilisé par un autre compte"
        else:
            user.email = email

    # ── telephone ──
    telephone = data.get("telephone", "").strip()
    if len(telephone) > 20:
        errors["telephone"] = "Max 20 caractères"
    else:
        user.telephone = telephone or None

    # ═══ AJOUTÉ : Mise à jour des préférences d'affichage ═══
    dark_mode = data.get("darkMode")
    if dark_mode is not None:
        user.dark_mode = bool(dark_mode)
    
    language = data.get("language")
    if language is not None:
        user.language = str(language)[:10]

    if errors:
        return jsonify({"errors": errors}), 400

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erreur base de données"}), 500

    return jsonify({
        "message": "Profil mis à jour avec succès",
        "profile": {
            "id_user":    user.id_user,
            "nom":        user.nom,
            "prenom":     user.prenom     or "",
            "email":      user.email,
            "telephone":  user.telephone  or "",
            "role":       user.role,
            "darkMode":   user.dark_mode if user.dark_mode is not None else False,
            "language":   user.language or "fr",
        }
    }), 200


# ═══════════════════════════════════════════════════════════════
# POST /user/change-password
# ═══════════════════════════════════════════════════════════════
@settings_bp.route("/user/change-password", methods=["POST"])
@token_required
def change_password():
    user_id = request.current_user.get("user_id")
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    data        = request.get_json() or {}
    current_pwd = data.get("currentPassword", "")
    new_pwd     = data.get("newPassword", "")

    if not check_password_hash(user.mot_de_passe_hash, current_pwd):
        return jsonify({"error": "Mot de passe actuel incorrect"}), 401

    if len(new_pwd) < 8:
        return jsonify({"error": "Le nouveau mot de passe doit contenir au moins 8 caractères"}), 400

    user.mot_de_passe_hash = generate_password_hash(new_pwd)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erreur base de données"}), 500

    return jsonify({"message": "Mot de passe modifié avec succès"}), 200


# ═══════════════════════════════════════════════════════════════
# GET /user/preferences
# ═══════════════════════════════════════════════════════════════
@settings_bp.route("/user/preferences", methods=["GET"])
@token_required
def get_preferences():
    latest = ThresholdHistory.query.order_by(
        ThresholdHistory.date_modification.desc()
    ).first()
    
    history = ThresholdHistory.query.order_by(
        ThresholdHistory.date_modification.desc()
    ).limit(20).all()
    
    return jsonify({
        "thresholds": {
            "riskMedium": float(latest.risk_medium) if latest else 0.45,
            "riskHigh": float(latest.risk_high) if latest else 0.75
        },
        "history": [{
            "id": h.id,
            "riskMedium": float(h.risk_medium),
            "riskHigh": float(h.risk_high),
            "modifiedBy": f"{h.user.prenom} {h.user.nom}" if h.user else "Système",
            "date": h.date_modification.strftime("%d/%m/%Y %H:%M")
        } for h in history]
    }), 200


# ═══════════════════════════════════════════════════════════════
# POST /user/preferences
# ═══════════════════════════════════════════════════════════════
@settings_bp.route("/user/preferences", methods=["POST"])
@token_required
def save_preferences():
    user_id = request.current_user.get("user_id")
    data = request.get_json() or {}
    
    thresholds = data.get("thresholds", {})
    risk_medium = float(thresholds.get("riskMedium", 0.45))
    risk_high = float(thresholds.get("riskHigh", 0.75))
    
    if not (0.2 <= risk_medium <= 0.6):
        return jsonify({"error": "Seuil moyen doit être entre 20% et 60%"}), 400
    if not (0.5 <= risk_high <= 0.95):
        return jsonify({"error": "Seuil élevé doit être entre 50% et 95%"}), 400
    if risk_high <= risk_medium:
        return jsonify({"error": "Seuil élevé doit être supérieur au seuil moyen"}), 400
    
    history_entry = ThresholdHistory(
        id_user=user_id,
        risk_medium=risk_medium,
        risk_high=risk_high
    )
    
    db.session.add(history_entry)
    db.session.commit()
    
    history = ThresholdHistory.query.order_by(
        ThresholdHistory.date_modification.desc()
    ).limit(20).all()
    
    return jsonify({
        "message": "Seuils enregistrés",
        "thresholds": {
            "riskMedium": risk_medium,
            "riskHigh": risk_high
        },
        "history": [{
            "id": h.id,
            "riskMedium": float(h.risk_medium),
            "riskHigh": float(h.risk_high),
            "modifiedBy": f"{h.user.prenom} {h.user.nom}" if h.user else "Système",
            "date": h.date_modification.strftime("%d/%m/%Y %H:%M")
        } for h in history]
    }), 200


# ═══════════════════════════════════════════════════════════════
# PUT /user/display — Route dédiée pour les prefs d'affichage
# ═══════════════════════════════════════════════════════════════
@settings_bp.route("/user/display", methods=["PUT"])
@token_required
def update_display():
    user_id = request.current_user.get("user_id")
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404
    
    data = request.get_json() or {}
    
    if "darkMode" in data:
        user.dark_mode = bool(data["darkMode"])
    if "language" in data:
        user.language = str(data["language"])[:10]
    
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erreur base de données"}), 500
    
    return jsonify({
        "message": "Préférences d'affichage enregistrées",
        "darkMode": user.dark_mode if user.dark_mode is not None else False,
        "language": user.language or "fr",
    }), 200