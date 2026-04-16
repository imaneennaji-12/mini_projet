import os
from flask import Flask, app
from flask_cors import CORS
from .models import db
from config import Config  
from app.routes import routes_bp  
from app.routes.auth import auth


def create_app():
    app = Flask(__name__, instance_relative_config=True)

    # Charger la configuration depuis config.py
    app.config.from_object(Config)

    #  créer le dossier instance
    os.makedirs(app.instance_path, exist_ok=True)

    #  initialiser la base de données
    db.init_app(app)
    #  créer les tables
    with app.app_context():
        db.create_all()
    #  2. activer CORS pour que React puisse appeler Flask
    CORS(app, origins=["http://localhost:5173"])

    app.register_blueprint(auth)

    app.register_blueprint(routes_bp, url_prefix="/api")

    return app