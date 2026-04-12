from flask import request, jsonify
from app.routes import routes_bp
from app.services.ml_service import predict_transaction

@routes_bp.route("/transactions/analyze", methods=["POST"])
def analyze_transaction():
    data = request.get_json()
    result = predict_transaction(data)
    return jsonify(result), 200