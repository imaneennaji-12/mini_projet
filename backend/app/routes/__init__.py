from flask import Blueprint

routes_bp = Blueprint("routes_bp", __name__)
Dashboard_bp= Blueprint("Dashboard", __name__)
auth_bp = Blueprint("auth_bp", __name__)
settings_bp = Blueprint('settings', __name__)
from app.routes.statistics import statistics_bp

from app.routes import transactions

from app.routes import Dashboard
from app.routes import auth
from app.routes import settings
