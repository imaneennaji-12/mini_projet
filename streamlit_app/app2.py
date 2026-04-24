import streamlit as st
import pandas as pd
import joblib
from datetime import datetime
import shap
import numpy as np
import matplotlib.pyplot as plt
import requests
# ==============================
# Page Config
# ==============================

st.set_page_config(page_title="Fraud Detection - Simulation", layout="wide")

# ==============================
# Load Production Model
# ==============================

#model = joblib.load("fraud_model_production1.pkl")
# Extract pipeline components
#'preprocessor = model.named_steps["preprocessing"]
#classifier = model.named_steps["model"]
st.title("Bank Fraud Detection - Simulation Interface")
st.write("App loaded successfully")
st.write("Academic Simulation - Model Testing Only")

st.markdown("---")

# ==============================
# Transaction Form
# ==============================

with st.form("transaction_form"):

    st.subheader("Transaction Identifiers")

    col_id1, col_id2 = st.columns(2)

    with col_id1:
        id_transaction = st.text_input("Transaction ID")

    with col_id2:
        client_id = st.text_input("Client ID")

    st.markdown("---")
    st.subheader("Transaction Features")

    col1, col2 = st.columns(2)

    with col1:
        amount = st.number_input("Transaction Amount", min_value=0.0)
        transaction_hour = st.slider("Transaction Hour", 0, 23)
        device_trust_score = st.slider("Device Trust Score", 0.0, 1.0)
        velocity_last_24h = st.number_input("Transactions in Last 24h", min_value=0)

    with col2:
        cardholder_age = st.number_input("Cardholder Age", min_value=18, max_value=100)
        foreign_transaction = st.selectbox("Foreign Transaction", [0, 1])
        location_mismatch = st.selectbox("Location Mismatch", [0, 1])
        merchant_category = st.selectbox(
            "Merchant Category",
            ["Grocery", "Food", "Travel", "Electronics", "Clothing"]
        )

    submitted = st.form_submit_button("Analyze Transaction")
# ==============================
# Prediction
# ==============================

if submitted:

    if id_transaction == "" or client_id == "":
        st.warning("Please enter Transaction ID and Client ID.")
    else:

        # Data for ML model (IDs NOT included)
        payload = {
            "id_transaction": id_transaction,
            "id_client": client_id,

            "amount": amount,
            "transaction_hour": transaction_hour,
            "device_trust_score": device_trust_score,
            "velocity_last_24h": velocity_last_24h,
            "cardholder_age": cardholder_age,
            "foreign_transaction": foreign_transaction,
            "location_mismatch": location_mismatch,
            "merchant_category": merchant_category
        }
        response = requests.post(
            "http://127.0.0.1:5000/api/transactions/analyze",
            json=payload
        )
        if response.status_code == 200:
            result = response.json()

            prediction = result["prediction"]
            probability = result["risk_score"]
            status = result["status"]
            shap_explanation = result.get("shap_explanation", [])

            st.markdown("---")
            st.subheader("Prediction Result")

            if prediction == 1:
                st.error(f"Fraud Detected - Risk Score: {probability:.2%}")
            else:
                st.success(f"Transaction Legitimate - Risk Score: {probability:.2%}")

            transaction_record = {
                "id_transaction": id_transaction,
                "id_client": client_id,
                "timestamp": str(datetime.now()),
                "amount": amount,
                "prediction": status,
                "risk_score": float(probability)
            }

            st.markdown("---")
            st.subheader("Simulated Database Record")
            st.json(transaction_record)

        else:
            st.error("Error while connecting to Flask API.")