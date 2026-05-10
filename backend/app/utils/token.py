# app/utils/auth.py
import jwt
from functools import wraps
from flask import request, jsonify
from decouple import config

SECRET_KEY = config("SECRET_KEY")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"message": "Token manquant"}), 401

        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expiré"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Token invalide"}), 401

        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    """Usage: @role_required("admin", "analyst")"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")

            if not auth_header.startswith("Bearer "):
                return jsonify({"message": "Token manquant"}), 401

            token = auth_header.split(" ")[1]

            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                request.current_user = payload
            except jwt.ExpiredSignatureError:
                return jsonify({"message": "Token expiré"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"message": "Token invalide"}), 401

            if payload.get("role") not in roles:
                return jsonify({
                    "message": f"Accès refusé — rôle requis : {', '.join(roles)}"
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator