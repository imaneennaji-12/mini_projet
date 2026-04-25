import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_mail import Mail
from .models import db
from config import Config

migrate = Migrate()
mail = Mail()

def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)

    CORS(app, origins=["http://localhost:5173"])

    from app.routes.auth import auth
    from app.routes import routes_bp
    from app.routes.Dashboard import Dashboard

    app.register_blueprint(auth)
    app.register_blueprint(routes_bp, url_prefix="/api")
    app.register_blueprint(Dashboard)

    return app