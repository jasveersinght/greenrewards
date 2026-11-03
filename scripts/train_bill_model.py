"""
Green Rewards - Household Energy Bill Machine Learning Model Trainer
Dataset: Household energy bill data.csv
Features:
- num_rooms: Number of rooms
- num_people: Number of people
- housearea: Square footage of home
- is_ac: Air conditioning present (1 or 0)
- is_tv: Television present (1 or 0)
- is_flat: Apartment/Flat (1) vs Independent house (0)
- ave_monthly_income: Average household monthly income
- num_children: Number of children in household
- is_urban: Urban area (1) vs Rural (0)
Target:
- amount_paid: Household electricity bill amount (in INR)
"""

import csv
import json
import os
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge, LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

CSV_PATH = "Household energy bill data.csv"
OUTPUT_MODEL_JSON = os.path.join("src", "server", "ml", "bill_model.json")
OUTPUT_METRICS_JSON = os.path.join("src", "server", "ml", "model_metrics.json")

def load_data():
    X = []
    y = []
    feature_names = [
        "num_rooms",
        "num_people",
        "housearea",
        "is_ac",
        "is_tv",
        "is_flat",
        "ave_monthly_income",
        "num_children",
        "is_urban",
    ]

    with open(CSV_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                features = [
                    float(row["num_rooms"]),
                    float(row["num_people"]),
                    float(row["housearea"]),
                    float(row["is_ac"]),
                    float(row["is_tv"]),
                    float(row["is_flat"]),
                    float(row["ave_monthly_income"]),
                    float(row["num_children"]),
                    float(row["is_urban"]),
                ]
                target = float(row["amount_paid"])
                X.append(features)
                y.append(target)
            except (ValueError, KeyError):
                continue

    return np.array(X), np.array(y), feature_names

def main():
    print(f"Loading dataset from {CSV_PATH}...")
    X, y, feature_names = load_data()
    n_samples, n_features = X.shape
    print(f"Loaded {n_samples} samples with {n_features} features.")

    # Train / Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Standard Scaler for Ridge/Linear Regression
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 1. Linear / Ridge Regression
    ridge = Ridge(alpha=1.0)
    ridge.fit(X_train_scaled, y_train)
    y_pred_ridge = ridge.predict(X_test_scaled)
    r2_ridge = r2_score(y_test, y_pred_ridge)
    mae_ridge = mean_absolute_error(y_test, y_pred_ridge)
    rmse_ridge = np.sqrt(mean_squared_error(y_test, y_pred_ridge))

    print(f"\n--- Linear / Ridge Regression ---")
    print(f"R2 Score: {r2_ridge:.4f}")
    print(f"MAE: Rs. {mae_ridge:.2f}")
    print(f"RMSE: Rs. {rmse_ridge:.2f}")

    # 2. Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    r2_rf = r2_score(y_test, y_pred_rf)
    mae_rf = mean_absolute_error(y_test, y_pred_rf)
    rmse_rf = np.sqrt(mean_squared_error(y_test, y_pred_rf))

    print(f"\n--- Random Forest Regressor ---")
    print(f"R2 Score: {r2_rf:.4f}")
    print(f"MAE: Rs. {mae_rf:.2f}")
    print(f"RMSE: Rs. {rmse_rf:.2f}")

    # 3. Gradient Boosting Regressor
    gb = GradientBoostingRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)
    gb.fit(X_train, y_train)
    y_pred_gb = gb.predict(X_test)
    r2_gb = r2_score(y_test, y_pred_gb)
    mae_gb = mean_absolute_error(y_test, y_pred_gb)
    rmse_gb = np.sqrt(mean_squared_error(y_test, y_pred_gb))

    print(f"\n--- Gradient Boosting Regressor ---")
    print(f"R2 Score: {r2_gb:.4f}")
    print(f"MAE: Rs. {mae_gb:.2f}")
    print(f"RMSE: Rs. {rmse_gb:.2f}")

    # Unscaled OLS Linear Regression for explicit equation weights
    ols = LinearRegression()
    ols.fit(X_train, y_train)
    ols_r2 = r2_score(y_test, ols.predict(X_test))
    ols_mae = mean_absolute_error(y_test, ols.predict(X_test))

    print(f"\n--- Unscaled Direct Regression Equation ---")
    print(f"Intercept: {ols.intercept_:.4f}")
    for name, coef in zip(feature_names, ols.coef_):
        print(f"  {name:20s}: {coef:+.4f}")

    # Feature Importance from Random Forest
    rf_importances = dict(zip(feature_names, [float(x) for x in rf.feature_importances_]))
    print(f"\nFeature Importances: {rf_importances}")

    # Prepare JSON Model Export
    os.makedirs(os.path.dirname(OUTPUT_MODEL_JSON), exist_ok=True)

    model_export = {
        "model_type": "Hybrid_OLS_and_RF_Forest",
        "feature_names": feature_names,
        "intercept": float(ols.intercept_),
        "coefficients": {
            name: float(coef) for name, coef in zip(feature_names, ols.coef_)
        },
        "scaler": {
            "mean": [float(m) for m in scaler.mean_],
            "scale": [float(s) for s in scaler.scale_],
        },
        "ridge_coefficients": {
            name: float(coef) for name, coef in zip(feature_names, ridge.coef_)
        },
        "ridge_intercept": float(ridge.intercept_),
        "feature_importances": rf_importances,
        "sample_stats": {
            "count": int(n_samples),
            "mean_bill": float(np.mean(y)),
            "min_bill": float(np.min(y)),
            "max_bill": float(np.max(y)),
            "std_bill": float(np.std(y)),
        },
        "metrics": {
            "r2_score": float(r2_rf),
            "mae": float(mae_rf),
            "rmse": float(rmse_rf),
            "ols_r2": float(ols_r2),
            "ols_mae": float(ols_mae),
        },
    }

    with open(OUTPUT_MODEL_JSON, "w", encoding="utf-8") as f:
        json.dump(model_export, f, indent=2)

    with open(OUTPUT_METRICS_JSON, "w", encoding="utf-8") as f:
        json.dump(model_export["metrics"], f, indent=2)

    print(f"\n[OK] Exported trained model weights to: {OUTPUT_MODEL_JSON}")
    print(f"[OK] Exported model metrics to: {OUTPUT_METRICS_JSON}")

if __name__ == "__main__":
    main()
