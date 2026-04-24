from flask import Blueprint

routes_bp = Blueprint("routes", __name__)
auth = Blueprint("auth", __name__)

from app.routes import transactions
from app.routes import auth