import os
from decouple import config
class Config:
    SECRET_KEY = config('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = config('DATABASE_URL')
    JWT_SECRET_KEY = config('JWT_SECRET_KEY') #Protège les tokens React ↔ Flask
    DEBUG   = config('DEBUG', default=False, cast=bool)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    