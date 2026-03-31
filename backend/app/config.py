import os

class Config:
    SECRET_KEY = 'dev'

    SQLALCHEMY_DATABASE_URI = 'sqlite:///db_banque.db'

    SQLALCHEMY_TRACK_MODIFICATIONS = False