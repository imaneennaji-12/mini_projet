from flask import Blueprint, request, jsonify
from app.models import User, db
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
import datetime
from decouple import config
from app.routes import auth_bp

SECRET_KEY = config("SECRET_KEY")


@auth_bp.route("/seed", methods=["POST"])
def seed():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "analyst")
    nom = data.get("nom")

    if not email or not password:
        return jsonify({"message": "email et mot de passe requis"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Utilisateur déjà existant"}), 409

    user = User(
        email=email,
        mot_de_passe_hash=generate_password_hash(password),
        nom=nom,
        role=role
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Utilisateur créé"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "Utilisateur introuvable"}), 404

    if not check_password_hash(user.mot_de_passe_hash, password):
        return jsonify({"message": "Mot de passe incorrect"}), 401

    token = jwt.encode({
        "user_id": user.id_user,
        "nom": user.nom,
        "email": user.email,
        "role": user.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({"token": token}), 200