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
    MAIL_SERVER = config("MAIL_SERVER")
    MAIL_PORT = config("MAIL_PORT", cast=int)
    MAIL_USERNAME = config("MAIL_USERNAME")
    MAIL_PASSWORD = config("MAIL_PASSWORD")
    MAIL_USE_TLS = config("MAIL_USE_TLS", default=True, cast=bool)
    MAIL_USE_SSL = config("MAIL_USE_SSL", default=False, cast=bool)
    MAIL_DEFAULT_SENDER = config("MAIL_DEFAULT_SENDER")