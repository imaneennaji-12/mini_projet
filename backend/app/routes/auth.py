from flask import Blueprint, request, jsonify
from app.models import User, db
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
import datetime
from decouple import config
from app.routes import auth_bp

SECRET_KEY = config("SECRET_KEY")



@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.mot_de_passe_hash, password):
        return jsonify({"message": "Email ou mot de passe incorrect"}), 401

    token = jwt.encode({
        "user_id": user.id_user,
        "nom": user.nom,
        "email": user.email,
        "role": user.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({"token": token}), 200