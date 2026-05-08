import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_mail import Mail
from .models import db
from config import Config
from flask_socketio import SocketIO


migrate = Migrate()
mail = Mail()
socketio = SocketIO(cors_allowed_origins="http://localhost:5173", async_mode='threading')

def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    socketio.init_app(app) 

    CORS(app, origins=["http://localhost:5173"])
    from app.routes.notifications import notifications_bp

    from app.routes import auth_bp
    from app.routes import routes_bp
    from app.routes import Dashboard_bp
    from app.routes import statistics_bp
    app.register_blueprint(statistics_bp)
    app.register_blueprint(notifications_bp)

    app.register_blueprint(auth_bp)
    app.register_blueprint(routes_bp, url_prefix="/api")
    app.register_blueprint(Dashboard_bp)

    return app