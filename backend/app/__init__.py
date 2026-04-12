import os
from flask import Flask
from .models import db
from config import Config  
from app.routes import routes_bp 

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

    #  route de test
    app.register_blueprint(routes_bp, url_prefix="/api")

    return app