import joblib
import pandas as pd
import os

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "ml_models",
    "fraud_model_production1.pkl"
)

model = joblib.load(MODEL_PATH)

def predict_transaction(data):
    input_data = pd.DataFrame({
        "amount": [data["amount"]],
        "transaction_hour": [data["transaction_hour"]],
        "device_trust_score": [data["device_trust_score"]],
        "velocity_last_24h": [data["velocity_last_24h"]],
        "cardholder_age": [data["cardholder_age"]],
        "foreign_transaction": [data["foreign_transaction"]],
        "location_mismatch": [data["location_mismatch"]],
        "merchant_category": [data["merchant_category"]],
    })

    prediction = int(model.predict(input_data)[0])
    probability = float(model.predict_proba(input_data)[0][1])

    status = "FRAUD" if prediction == 1 else "LEGITIMATE"

    return {
        "prediction": prediction,
        "risk_score": probability,
        "status": status
    }
