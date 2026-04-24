import joblib
import pandas as pd
import os
import shap
import numpy as np

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "ml_models",
    "fraud_model_production1.pkl"
)

model = joblib.load(MODEL_PATH)
preprocessor = model.named_steps["preprocessing"]
classifier = model.named_steps["model"]

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
    probability = round(float(model.predict_proba(input_data)[0][1]), 2)

    status = "FRAUD" if prediction == 1 else "LEGITIMATE"
    shap_data = []

    try:
        preprocessed_input = preprocessor.transform(input_data)
        explainer = shap.TreeExplainer(classifier)
        shap_values = explainer(preprocessed_input)
        feature_names = preprocessor.get_feature_names_out()

        for i, feature in enumerate(feature_names):
            shap_data.append({
                "feature": str(feature),
                "value": float(shap_values.values[0][i])
            })
    except Exception as e:
       shap_data = [{"error": str(e)}]

    return {
        "prediction": prediction,
        "risk_score": probability,
        "status": status,
        "shap_explanation": shap_data
    }
