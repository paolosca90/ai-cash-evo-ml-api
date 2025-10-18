import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, mean_squared_error, classification_report
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

def generate_synthetic_dom_data(n_samples=1000):
    """
    Genera dati DOM sintetici per dimostrazione ML
    """

    print(f"Generando {n_samples} campioni di dati DOM sintetici...")

    # Simula timestamp
    timestamps = pd.date_range(start='2024-01-01', periods=n_samples, freq='1min')

    # Simula mid price con trend e volatilità
    base_price = 25000
    trend = np.linspace(0, 100, n_samples)  # Trend crescente
    noise = np.random.normal(0, 10, n_samples)  # Rumore
    mid_price = base_price + trend + noise

    # Simula spread
    base_spread = 2.0
    spread = base_spread + np.random.exponential(1, n_samples) + np.sin(np.linspace(0, 10, n_samples))

    # Simula bid e ask
    bid_prices = mid_price - spread/2
    ask_prices = mid_price + spread/2

    # Simula volumi bid/ask
    bid_volume = np.random.lognormal(mean=3, sigma=1, size=n_samples)
    ask_volume = np.random.lognormal(mean=3, sigma=1, size=n_samples)

    # Simula livelli DOM profondi
    data = {
        'datetime': timestamps,
        'timestamp': timestamps.astype(np.int64) // 10**9,
        'mid_price': mid_price,
        'best_bid': bid_prices,
        'best_ask': ask_prices,
        'spread': spread,
        'best_bid_volume': bid_volume,
        'best_ask_volume': ask_volume,
        'total_bid_volume': bid_volume * np.random.uniform(2, 5, n_samples),
        'total_ask_volume': ask_volume * np.random.uniform(2, 5, n_samples),
        'volume_imbalance': bid_volume - ask_volume
    }

    # Aggiungi livelli DOM aggiuntivi
    for level in range(1, 11):
        bid_offset = level * 0.5 + np.random.uniform(-0.1, 0.1, n_samples)
        ask_offset = level * 0.5 + np.random.uniform(-0.1, 0.1, n_samples)

        data[f'bid_{level}_price'] = bid_prices - bid_offset
        data[f'ask_{level}_price'] = ask_prices + ask_offset
        data[f'bid_{level}_volume'] = bid_volume * np.random.uniform(0.8, 1.2, n_samples)
        data[f'ask_{level}_volume'] = ask_volume * np.random.uniform(0.8, 1.2, n_samples)

    df = pd.DataFrame(data)
    df.set_index('datetime', inplace=True)

    return df

def create_ml_features(df):
    """Crea feature per machine learning"""

    # Price momentum
    for period in [1, 3, 5, 10]:
        df[f'price_momentum_{period}'] = df['mid_price'].pct_change(period)
        df[f'spread_momentum_{period}'] = df['spread'].pct_change(period)

    # Moving averages
    for window in [5, 10, 20]:
        df[f'price_ma_{window}'] = df['mid_price'].rolling(window).mean()
        df[f'spread_ma_{window}'] = df['spread'].rolling(window).mean()
        df[f'volume_ma_{window}'] = df['total_bid_volume'].rolling(window).mean()

    # Volatility
    df['price_volatility'] = df['mid_price'].rolling(10).std()
    df['spread_volatility'] = df['spread'].rolling(10).std()

    # Volume indicators
    df['volume_ratio'] = df['total_bid_volume'] / (df['total_ask_volume'] + 1e-8)
    df['volume_change'] = df['total_bid_volume'].pct_change()

    # Order book imbalance
    df['imbalance_ratio'] = df['volume_imbalance'] / (df['total_bid_volume'] + df['total_ask_volume'] + 1e-8)

    # Create target variables
    df['price_direction'] = (df['mid_price'].shift(-1) > df['mid_price']).astype(int)
    df['price_change'] = df['mid_price'].shift(-1) - df['mid_price']
    df['price_return'] = df['mid_price'].pct_change().shift(-1)

    # Remove NaN values
    df = df.dropna()

    return df

def prepare_ml_data(df):
    """Prepara dati per machine learning"""

    # Select features (escludiamo target e datetime)
    exclude_cols = ['timestamp', 'price_direction', 'price_change', 'price_return']
    feature_cols = [col for col in df.columns if col not in exclude_cols and df[col].dtype != 'object']

    X = df[feature_cols].values

    # Features per classificazione
    y_clf = df['price_direction'].values

    # Features per regressione
    y_reg = df['price_return'].values

    # Split temporale (80% training, 20% test)
    split_idx = int(len(X) * 0.8)

    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train_clf, y_test_clf = y_clf[:split_idx], y_clf[split_idx:]
    y_train_reg, y_test_reg = y_reg[:split_idx], y_reg[split_idx:]

    # Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    return {
        'X_train': X_train_scaled,
        'X_test': X_test_scaled,
        'y_train_clf': y_train_clf,
        'y_test_clf': y_test_clf,
        'y_train_reg': y_train_reg,
        'y_test_reg': y_test_reg,
        'feature_names': feature_cols,
        'scaler': scaler
    }

def train_classification_models(data):
    """Addestra modelli di classificazione"""

    print("\n=== ADDESTRAMENTO MODELLI DI CLASSIFICAZIONE ===")

    # Random Forest
    rf_clf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_clf.fit(data['X_train'], data['y_train_clf'])

    # Predizioni
    y_pred = rf_clf.predict(data['X_test'])
    accuracy = accuracy_score(data['y_test_clf'], y_pred)

    print(f"Random Forest Accuracy: {accuracy:.3f}")
    print("\nClassification Report:")
    print(classification_report(data['y_test_clf'], y_pred))

    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': data['feature_names'],
        'importance': rf_clf.feature_importances_
    }).sort_values('importance', ascending=False)

    print("\nTop 10 Feature Importance:")
    print(feature_importance.head(10))

    return rf_clf, feature_importance

def train_regression_models(data):
    """Addestra modelli di regressione"""

    print("\n=== ADDESTRAMENTO MODELLI DI REGRESSIONE ===")

    # Random Forest Regressor
    rf_reg = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_reg.fit(data['X_train'], data['y_train_reg'])

    # Predizioni
    y_pred = rf_reg.predict(data['X_test'])
    mse = mean_squared_error(data['y_test_reg'], y_pred)
    rmse = np.sqrt(mse)

    print(f"Random Forest RMSE: {rmse:.6f}")
    print(f"Target range: [{data['y_test_reg'].min():.6f}, {data['y_test_reg'].max():.6f}]")

    return rf_reg

def main():
    """Pipeline completa ML"""

    print("=== PIPELINE MACHINE LEARNING PER DATI DOM ===")

    # Genera dati sintetici (poiché abbiamo solo una riga reale)
    df = generate_synthetic_dom_data(n_samples=2000)
    print(f"Dati generati: {df.shape}")

    # Feature engineering
    df = create_ml_features(df)
    print(f"Dati dopo feature engineering: {df.shape}")

    # Prepara dati ML
    ml_data = prepare_ml_data(df)
    print(f"Training set: {ml_data['X_train'].shape}")
    print(f"Test set: {ml_data['X_test'].shape}")

    # Addestra modelli
    rf_clf, feature_importance = train_classification_models(ml_data)
    rf_reg = train_regression_models(ml_data)

    # Salva risultati
    df.to_csv('synthetic_dom_data_ml_ready.csv')
    feature_importance.to_csv('feature_importance.csv', index=False)

    # Salva modelli
    import pickle
    with open('models.pkl', 'wb') as f:
        pickle.dump({
            'classification_model': rf_clf,
            'regression_model': rf_reg,
            'scaler': ml_data['scaler'],
            'feature_names': ml_data['feature_names']
        }, f)

    print(f"\n=== RISULTATI SALVATI ===")
    print(f"Dataset completo: synthetic_dom_data_ml_ready.csv")
    print(f"Feature importance: feature_importance.csv")
    print(f"Modelli: models.pkl")

    # Esempio di predizione
    print(f"\n=== ESEMPIO DI PREDIZIONE ===")
    sample = ml_data['X_test'][:1]

    pred_direction = rf_clf.predict(sample)[0]
    pred_direction_prob = rf_clf.predict_proba(sample)[0]
    pred_return = rf_reg.predict(sample)[0]

    print(f"Predizione direzione prezzo: {'SU' if pred_direction else 'GIÙ'}")
    print(f"Probabilità: [{pred_direction_prob[0]:.3f}, {pred_direction_prob[1]:.3f}]")
    print(f"Predizione rendimento: {pred_return:.6f}")

    return df, ml_data, rf_clf, rf_reg

if __name__ == "__main__":
    df, ml_data, clf_model, reg_model = main()