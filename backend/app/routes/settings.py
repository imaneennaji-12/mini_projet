from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from app.models import db, User
from app.utils.token import token_required, role_required  # ← TON système, pas flask_jwt_extended
from app.routes import settings_bp



# ═══════════════════════════════════════════════════════════════
# GET /api/user/profile
# ═══════════════════════════════════════════════════════════════
@settings_bp.route("/user/profile", methods=["GET"])
@token_required
def get_profile():
    user_id = request.current_user.get("user_id")  # ← extrait du JWT via ton décorateur
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
        "avatar_url":    user.avatar_url or "",
        "date_creation": user.date_creation.strftime("%d/%m/%Y") if user.date_creation else "",
    }), 200


# ═══════════════════════════════════════════════════════════════
# PUT /api/user/profile
# ═══════════════════════════════════════════════════════════════
@settings_bp.route("/user/profile", methods=["PUT"])
@token_required
def update_profile():
    user_id = request.current_user.get("user_id")
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    data   = request.get_json() or {}
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
           
        }
    }), 200


# ═══════════════════════════════════════════════════════════════
# POST /api/user/change-password
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
# POST /api/user/preferences  (notifications, seuils, système)
# Stocke en JSON dans un champ texte — ajoute preferences_json
# à ton modèle User si tu veux persister, sinon répond 200 OK
# ═══════════════════════════════════════════════════════════════
@settings_bp.route("/user/preferences", methods=["GET", "POST"])
@token_required
def preferences():
    # GET → retourne des préférences par défaut (à enrichir si tu ajoutes la colonne)
    if request.method == "GET":
        return jsonify({"preferences": {}}), 200

    # POST → reçoit et ignore pour l'instant (frontend ne plante pas)
    return jsonify({"message": "Préférences enregistrées"}), 200