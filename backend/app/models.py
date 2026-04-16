# flaskr/db_models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

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
    transaction_id = db.Column(db.String(50))
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


class FraudeDetectee(db.Model):
    __tablename__ = 'fraudes_detectees'
    id_fraude = db.Column(db.Integer, primary_key=True)
    id_transaction = db.Column(db.Integer, db.ForeignKey('transactions.id_transaction'), nullable=False)
    prediction = db.Column(db.Integer, nullable=False)  # 1 = Fraude, 0 = Normale
    probabilite = db.Column(db.Float)
    modele_utilise = db.Column(db.String(100))
    date_detection = db.Column(db.DateTime, default=datetime.utcnow)

    alertes = db.relationship('Alerte', backref='fraude', lazy=True)


class Alerte(db.Model):
    __tablename__ = 'alertes'
    id_alerte = db.Column(db.Integer, primary_key=True)
    id_fraude = db.Column(db.Integer, db.ForeignKey('fraudes_detectees.id_fraude'), nullable=False)
    niveau_risque = db.Column(db.String(20))
    statut = db.Column(db.String(50), default='En attente')
    message = db.Column(db.Text)
    date_alerte = db.Column(db.DateTime, default=datetime.utcnow)

    decisions = db.relationship('DecisionAdmin', backref='alerte', lazy=True)
    investigations = db.relationship('Investigation', backref='alerte', lazy=True)


class DecisionAdmin(db.Model):
    __tablename__ = 'decisions_admin'
    id_decision = db.Column(db.Integer, primary_key=True)
    id_alerte = db.Column(db.Integer, db.ForeignKey('alertes.id_alerte'), nullable=False)
    id_user = db.Column(db.Integer, db.ForeignKey('users.id_user'), nullable=False)
    decision = db.Column(db.String(20))
    commentaire = db.Column(db.Text)
    date_decision = db.Column(db.DateTime, default=datetime.utcnow)


class Statistique(db.Model):
    __tablename__ = 'statistiques'
    id_stat = db.Column(db.Integer, primary_key=True)
    total_transactions = db.Column(db.Integer)
    total_fraudes = db.Column(db.Integer)
    taux_fraude = db.Column(db.Float)
    periode = db.Column(db.String(20))
    date_generation = db.Column(db.DateTime, default=datetime.utcnow)


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
    notifications = db.relationship('NotificationClient', backref='client', lazy=True)
    investigations = db.relationship('Investigation', backref='client', lazy=True)


class User(db.Model):
    __tablename__ = 'users'
    id_user = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True)
    email = db.Column(db.String(120), unique=True)
    password = db.Column(db.String(200))
    role = db.Column(db.String(20))
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    decisions = db.relationship('DecisionAdmin', backref='user', lazy=True)


class Investigation(db.Model):
    __tablename__ = 'investigations'
    id_investigation = db.Column(db.Integer, primary_key=True)
    id_alerte = db.Column(db.Integer, db.ForeignKey('alertes.id_alerte'), nullable=False)
    id_client = db.Column(db.Integer, db.ForeignKey('clients.id_client'), nullable=False)
    message_admin = db.Column(db.Text)
    reponse_client = db.Column(db.Text)
    statut = db.Column(db.String(20), default='En cours')
    date_demande = db.Column(db.DateTime, default=datetime.utcnow)
    date_reponse = db.Column(db.DateTime)


class NotificationClient(db.Model):
    __tablename__ = 'notifications_client'
    id_notification = db.Column(db.Integer, primary_key=True)
    id_client = db.Column(db.Integer, db.ForeignKey('clients.id_client'), nullable=False)
    type = db.Column(db.String(50))
    message = db.Column(db.Text)
    statut = db.Column(db.String(20), default='Envoyé')
    date_envoi = db.Column(db.DateTime, default=datetime.utcnow)