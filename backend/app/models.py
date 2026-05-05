# flaskr/db_models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

import secrets

db = SQLAlchemy()


class Transaction(db.Model):
    __tablename__ = 'transactions'
    id_transaction = db.Column(db.Integer, primary_key=True)

    # relation client
    id_client = db.Column(
        db.Integer,
        db.ForeignKey('clients.id_client'),
        nullable=False
    )

    # infos transaction
    montant = db.Column(db.Float, nullable=False)
    transaction_hour = db.Column(db.Integer)
    date_transaction = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )
    # localisation
    city = db.Column(db.String(100))
    country = db.Column(db.String(100))

    # features modèle ML
    device_trust_score = db.Column(db.Float)
    velocity_last_24h = db.Column(db.Integer)
    cardholder_age = db.Column(db.Integer)
    foreign_transaction = db.Column(db.Integer)
    location_mismatch = db.Column(db.Integer)
    merchant_category = db.Column(db.String(50))
      # résultat modèle
    prediction = db.Column(db.Integer)
    risk_score = db.Column(db.Float)
    risk_level = db.Column(db.String(20))

    # statut workflow
    statut = db.Column(
        db.String(20),
        default='En attente'
    )

    # signaux d'alerte
    alert_signals = db.Column(db.Text)
     # relation fraude
    fraudes_detectees = db.relationship(
        'FraudeDetectee',
        backref='transaction',
        lazy=True
    )
    decisions_humaines = db.relationship(
    'DecisionHumaine', backref='transaction',
    lazy=True, cascade='all, delete-orphan'
    )
    investigations = db.relationship(
    'Investigation', backref='transaction', lazy=True
    )

class User(db.Model):
    __tablename__ = 'users'
    id_user       = db.Column(db.Integer, primary_key=True)
    nom            = db.Column(db.String(100), nullable=False)
    email          = db.Column(db.String(120), unique=True, nullable=False)
    role           = db.Column(db.String(30), default='analyste')  # 'admin', 'analyste'
    mot_de_passe_hash = db.Column(db.String(256))
    actif          = db.Column(db.Boolean, default=True)
    date_creation  = db.Column(db.DateTime, default=datetime.utcnow)

    decisions = db.relationship('DecisionHumaine', backref='user', lazy=True)


class DecisionHumaine(db.Model):
    __tablename__ = 'decisions_humaines'
    id             = db.Column(db.Integer, primary_key=True)

    id_transaction = db.Column(db.Integer, db.ForeignKey('transactions.id_transaction'), nullable=False)
    id_user       = db.Column(db.Integer, db.ForeignKey('users.id_user'), nullable=False)

    # 'approuvé' ou 'refusé'
    decision      = db.Column(db.String(20), nullable=False)
    commentaire    = db.Column(db.Text)
    date_decision  = db.Column(db.DateTime, default=datetime.utcnow)



    # Modèles pour clients
class Client(db.Model):
    __tablename__ = 'clients'
    id_client = db.Column(db.Integer, primary_key=True)

    nom = db.Column(db.String(50), nullable=False)
    prenom = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    telephone = db.Column(db.String(20), nullable=False)

    ville = db.Column(db.String(50))
    pays = db.Column(db.String(50))

    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    transactions = db.relationship('Transaction', backref='client', lazy=True)
    investigations = db.relationship('Investigation', backref='client', lazy=True)


class FraudeDetectee(db.Model):
    __tablename__ = 'fraudes_detectees'
    id                  = db.Column(db.Integer, primary_key=True,autoincrement=True)

    id_transaction      = db.Column(db.Integer, db.ForeignKey('transactions.id_transaction'), nullable=False)

    date_detection      = db.Column(db.DateTime, default=datetime.utcnow)
    confirme_par_agent  = db.Column(db.Boolean, default=False)
    confirme_par_client = db.Column(db.Boolean, default=False)

    # 'carte_volée', 'identité_usurpée', 'phishing', 'inconnu'
    type_fraude         = db.Column(db.String(50), default='inconnu')
    montant_fraude      = db.Column(db.Float)



class Investigation(db.Model):
    __tablename__ = 'investigations'
    id_investigation            = db.Column(db.Integer, primary_key=True)

    id_transaction = db.Column(db.Integer, db.ForeignKey('transactions.id_transaction'), nullable=False)
    id_client      = db.Column(db.Integer, db.ForeignKey('clients.id_client'), nullable=False)

    # token unique pour les liens OUI/NON dans l'email
    token          = db.Column(db.String(100), unique=True,
                               default=lambda: secrets.token_urlsafe(32))
    token_expiry   = db.Column(db.DateTime)

    # 'en_attente', 'confirmé_client', 'refusé_client', 'expiré'
    statut_inv     = db.Column(db.String(30), default='en_attente')
    reponse_client = db.Column(db.String(20))   # 'oui_cest_moi' | 'non_fraude'
    date_reponse   = db.Column(db.DateTime)
    date_creation  = db.Column(db.DateTime, default=datetime.utcnow)
    email_envoye = db.Column(db.Boolean, default=False)
    date_envoi_email = db.Column(db.DateTime)
    reponses = db.relationship('ReponseClient', backref='investigation', lazy=True)
# ────────────────────────────────────────────
# TABLE: ReponseClient (trace du clic client)
# ────────────────────────────────────────────
class ReponseClient(db.Model):
    __tablename__ = 'reponses_client'
    id               = db.Column(db.Integer, primary_key=True)

    id_investigation = db.Column(db.Integer, db.ForeignKey('investigations.id_investigation'), nullable=False)

    reponse          = db.Column(db.String(20))   # 'oui' ou 'non'
    date_reponse     = db.Column(db.DateTime, default=datetime.utcnow)
    ip_client        = db.Column(db.String(50)) 
