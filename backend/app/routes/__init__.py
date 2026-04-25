from flask import Blueprint

routes_bp = Blueprint("routes_bp", __name__)
auth = Blueprint("auth", __name__)
Dashboard = Blueprint("Dashboard", __name__)

from app.routes import transactions
from app.routes import auth
from app.routes import Dashboard