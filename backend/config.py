import os
from decouple import config

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DEFAULT_DB = f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'db_banque.db')}"

class Config:
    SECRET_KEY = config("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = config("DATABASE_URL", default=DEFAULT_DB)
    JWT_SECRET_KEY = config("JWT_SECRET_KEY")
    DEBUG = config("DEBUG", default=False, cast=bool)
    SQLALCHEMY_TRACK_MODIFICATIONS = False