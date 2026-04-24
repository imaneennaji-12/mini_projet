from flask import Blueprint, request, jsonify
from app.models import User
from app.models import db
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
import datetime
from decouple import config
from app.routes import auth


SECRET_KEY = config("SECRET_KEY")


# ── Créer un utilisateur de test ──────────────────────────────────────────────
@auth.route("/seed", methods=["POST"])
def seed():
    data     = request.get_json()
    email    = data.get("email")
    mot_de_passe_hash = data.get("password")
    role     = data.get("role", "analyst")
    username = data.get("username")
    if not email or not mot_de_passe_hash:
        return jsonify({"message": "email et mot de passe requis"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Utilisateur déjà existant"}), 409

    user = User(
        email=email,
        mot_de_passe_hash=generate_password_hash(mot_de_passe_hash),
        username=username,
        role=role
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Utilisateur créé", "email": email, "role": role, "username": username}), 201


# ── Login ─────────────────────────────────────────────────────────────────────
@auth.route("/login", methods=["POST"])
def login():
    data     = request.get_json()
    email    = data.get("email")
    mot_de_passe_hash= data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "Utilisateur introuvable"}), 404

    if not check_password_hash(user.mot_de_passe_hash, mot_de_passe_hash):
        return jsonify({"message": "Mot de passe incorrect"}), 401

    token = jwt.encode({
        "user_id": user.id_user,
        "email":   user.email,
        "role":    user.role,
        "exp":     datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({"message": "Connexion réussie", "token": token}), 200