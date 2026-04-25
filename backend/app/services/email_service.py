from flask_mail import Message
from app import mail

def send_investigation_email(to_email, subject, html_body):
    msg = Message(
        subject=subject,
        recipients=[to_email],
        sender="imaneennaji142@gmail.com"
    )

    msg.html = html_body
    mail.send(msg)