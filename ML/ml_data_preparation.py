import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore')

class DOMDataPreprocessor:
    """
    Prepara dati DOM per machine learning con feature engineering avanzato
    """

    def __init__(self, df):
        self.df = df.copy()
        self.scaler = None
        self.feature_columns = []
        self.target_column = None

    def create_technical_indicators(self):
        """Crea indicatori tecnici per il trading"""

        # Price-based indicators
        self.df['price_change'] = self.df['mid_price'].pct_change()
        self.df['spread_change'] = self.df['spread'].pct_change()
        self.df['bid_ask_ratio_change'] = self.df['bid_ask_ratio'].pct_change()

        # Volume-based indicators
        self.df['volume_ratio'] = self.df['total_bid_volume'] / (self.df['total_ask_volume'] + 1e-8)
        self.df['volume_change'] = self.df['total_bid_volume'].pct_change()

        # Moving averages
        for window in [3, 5, 10]:
            self.df[f'mid_price_ma_{window}'] = self.df['mid_price'].rolling(window).mean()
            self.df[f'spread_ma_{window}'] = self.df['spread'].rolling(window).mean()
            self.df[f'volume_ma_{window}'] = self.df['total_bid_volume'].rolling(window).mean()

        # Price momentum indicators
        for period in [1, 3, 5]:
            self.df[f'mid_price_momentum_{period}'] = self.df['mid_price'].pct_change(period)
            self.df[f'spread_momentum_{period}'] = self.df['spread'].pct_change(period)

        # Order book imbalance indicators
        self.df['level_1_imbalance'] = self.df['bid_1_volume'] - self.df['ask_1_volume']
        self.df['top_3_imbalance'] = (self.df['bid_1_volume'] + self.df['bid_2_volume'] + self.df['bid_3_volume']) - \
                                   (self.df['ask_1_volume'] + self.df['ask_2_volume'] + self.df['ask_3_volume'])

        # Liquidity indicators
        self.df['bid_liquidity_ratio'] = self.df['bid_1_volume'] / (self.df['total_bid_volume'] + 1e-8)
        self.df['ask_liquidity_ratio'] = self.df['ask_1_volume'] / (self.df['total_ask_volume'] + 1e-8)

        # Volatility indicators
        self.df['price_volatility_5'] = self.df['mid_price'].rolling(5).std()
        self.df['spread_volatility_5'] = self.df['spread'].rolling(5).std()

        return self.df

    def create_lag_features(self, lags=[1, 2, 3, 5]):
        """Crea feature lag per time series"""

        important_cols = ['mid_price', 'spread', 'volume_imbalance', 'best_bid', 'best_ask']

        for col in important_cols:
            for lag in lags:
                self.df[f'{col}_lag_{lag}'] = self.df[col].shift(lag)

        return self.df

    def create_interaction_features(self):
        """Crea feature di interazione"""

        # Price-volume interactions
        self.df['bid_price_volume_interaction'] = self.df['best_bid'] * self.df['best_bid_volume']
        self.df['ask_price_volume_interaction'] = self.df['best_ask'] * self.df['best_ask_volume']

        # Spread interactions
        self.df['spread_volume_interaction'] = self.df['spread'] * self.df['total_bid_volume']

        # Imbalance interactions
        self.df['imbalance_price_interaction'] = self.df['volume_imbalance'] * self.df['mid_price']

        return self.df

    def create_target_variables(self, horizon=1):
        """Crea variabili target per predizione"""

        # Price direction prediction (binary classification)
        self.df['price_direction'] = (self.df['mid_price'].shift(-horizon) > self.df['mid_price']).astype(int)

        # Price change prediction (regression)
        self.df['price_change_target'] = self.df['mid_price'].shift(-horizon) - self.df['mid_price']
        self.df['price_return_target'] = self.df['mid_price'].pct_change(horizon).shift(-horizon)

        # Spread prediction
        self.df['spread_change_target'] = self.df['spread'].shift(-horizon) - self.df['spread']

        # Volume imbalance prediction
        self.df['imbalance_change_target'] = self.df['volume_imbalance'].shift(-horizon) - self.df['volume_imbalance']

        return self.df

    def clean_data(self):
        """Pulizia dati per ML"""

        # Rimuovi righe con NaN
        initial_rows = len(self.df)
        self.df = self.df.dropna()
        final_rows = len(self.df)

        print(f"Rimosse {initial_rows - final_rows} righe con valori mancanti")
        print(f"Rimanenti: {final_rows} righe")

        # Rimuovi outliers estremi (es. usando IQR)
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            if col not in ['datetime', 'timestamp']:
                Q1 = self.df[col].quantile(0.25)
                Q3 = self.df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 3 * IQR
                upper_bound = Q3 + 3 * IQR

                outliers = ((self.df[col] < lower_bound) | (self.df[col] > upper_bound)).sum()
                if outliers > 0:
                    self.df = self.df[(self.df[col] >= lower_bound) & (self.df[col] <= upper_bound)]
                    print(f"Rimossi {outliers} outliers dalla colonna {col}")

        return self.df

    def select_features(self, exclude_cols=None):
        """Seleziona feature per il modello ML"""

        if exclude_cols is None:
            exclude_cols = ['datetime', 'timestamp', 'price_direction', 'price_change_target',
                          'price_return_target', 'spread_change_target', 'imbalance_change_target']

        # Seleziona solo colonne numeriche
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns.tolist()
        self.feature_columns = [col for col in numeric_cols if col not in exclude_cols]

        print(f"Feature selezionate: {len(self.feature_columns)}")
        print("Prime 10 feature:", self.feature_columns[:10])

        return self.feature_columns

    def prepare_data_for_ml(self, target_type='classification', test_size=0.2, scale_data=True):
        """Prepara dati finali per machine learning"""

        # Definisci target
        if target_type == 'classification':
            self.target_column = 'price_direction'
        elif target_type == 'regression':
            self.target_column = 'price_return_target'
        elif target_type == 'spread_prediction':
            self.target_column = 'spread_change_target'
        else:
            raise ValueError("target_type deve essere 'classification', 'regression' o 'spread_prediction'")

        # Features e target
        X = self.df[self.feature_columns].values
        y = self.df[self.target_column].values

        # Split temporale (migliore per time series)
        split_index = int(len(X) * (1 - test_size))
        X_train, X_test = X[:split_index], X[split_index:]
        y_train, y_test = y[:split_index], y[split_index:]

        # Scaling
        if scale_data:
            self.scaler = StandardScaler()
            X_train = self.scaler.fit_transform(X_train)
            X_test = self.scaler.transform(X_test)

        print(f"\nDataset preparato per {target_type}:")
        print(f"Training set: {X_train.shape}")
        print(f"Test set: {X_test.shape}")
        print(f"Target distribution: {np.bincount(y_train.astype(int))}")

        return X_train, X_test, y_train, y_test

    def get_feature_importance_data(self):
        """Prepara dati per analisi feature importance"""

        return {
            'feature_names': self.feature_columns,
            'feature_values': self.df[self.feature_columns].values,
            'target_values': self.df[self.target_column].values
        }

def main():
    """Pipeline completa di preparazione dati per ML"""

    # Carica dati processati
    try:
        df = pd.read_csv('tick_export_dom10L_processed.csv', parse_dates=['datetime'], index_col='datetime')
        print(f"Dati caricati: {df.shape}")
    except FileNotFoundError:
        print("Errore: File tick_export_dom10L_processed.csv non trovato")
        print("Esegui prima csv_to_pandas_converter.py")
        return

    # Inizializza preprocessore
    preprocessor = DOMDataPreprocessor(df)

    # Pipeline di feature engineering
    print("\n=== FEATURE ENGINEERING ===")
    preprocessor.create_technical_indicators()
    preprocessor.create_lag_features()
    preprocessor.create_interaction_features()
    preprocessor.create_target_variables(horizon=1)

    # Pulizia dati
    print("\n=== PULIZIA DATI ===")
    preprocessor.clean_data()

    # Selezione feature
    print("\n=== SELEZIONE FEATURE ===")
    preprocessor.select_features()

    # Prepara dati per diversi task ML
    print("\n=== PREPARAZIONE DATI PER CLASSIFICAZIONE ===")
    X_train_clf, X_test_clf, y_train_clf, y_test_clf = preprocessor.prepare_data_for_ml(
        target_type='classification', test_size=0.2
    )

    print("\n=== PREPARAZIONE DATI PER REGRESSIONE ===")
    X_train_reg, X_test_reg, y_train_reg, y_test_reg = preprocessor.prepare_data_for_ml(
        target_type='regression', test_size=0.2
    )

    # Salva dati preparati
    prepared_data = {
        'classification': {
            'X_train': X_train_clf,
            'X_test': X_test_clf,
            'y_train': y_train_clf,
            'y_test': y_test_clf,
            'feature_names': preprocessor.feature_columns,
            'target_column': preprocessor.target_column
        },
        'regression': {
            'X_train': X_train_reg,
            'X_test': X_test_reg,
            'y_train': y_train_reg,
            'y_test': y_test_reg,
            'feature_names': preprocessor.feature_columns,
            'target_column': preprocessor.target_column
        }
    }

    # Salva in file pickle per uso futuro
    import pickle
    with open('ml_prepared_data.pkl', 'wb') as f:
        pickle.dump(prepared_data, f)

    # Salva anche il dataframe completo con tutte le feature
    preprocessor.df.to_csv('tick_export_dom10L_ml_ready.csv')
    print(f"\nDati completi salvati in: tick_export_dom10L_ml_ready.csv")
    print(f"Dati ML preparati salvati in: ml_prepared_data.pkl")

    # Statistiche finali
    print(f"\n=== STATISTICHE FINALI ===")
    print(f"Feature totali create: {len(preprocessor.feature_columns)}")
    print(f"Righe finali: {len(preprocessor.df)}")
    print(f"Periodo: {preprocessor.df.index.min()} a {preprocessor.df.index.max()}")

    return preprocessor, prepared_data

if __name__ == "__main__":
    preprocessor, data = main()