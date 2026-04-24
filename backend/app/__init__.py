import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from .models import db
from config import Config
from app.routes import routes_bp
from app.routes.auth import auth
from app.routes.Dashboord import dashboard

migrate = Migrate()

def create_app():
    app = Flask(__name__, instance_relative_config=True)

    # Charger la configuration
    app.config.from_object(Config)

    # Créer le dossier instance
    os.makedirs(app.instance_path, exist_ok=True)

    # Initialiser la base
    db.init_app(app)
    migrate.init_app(app, db)

    # Activer CORS
    CORS(app, origins=["http://localhost:5173"])

    # Enregistrer les blueprints
    app.register_blueprint(auth)
    app.register_blueprint(dashboard)
    app.register_blueprint(routes_bp, url_prefix="/api")

    return app