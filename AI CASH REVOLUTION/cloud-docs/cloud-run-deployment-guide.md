# Google Cloud Run Deployment Guide for AI Cash Evolution

## Quick Start Deployment

### Prerequisites
```bash
# Install Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud auth login
gcloud config set project your-project-id

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### 1. Prepare Application

**Create Cloud Run optimized Dockerfile:**
```dockerfile
# File: Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/root/.local/bin:$PATH"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY railway-ml-service/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy application code
COPY railway-ml-service/ /app/
WORKDIR /app

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start command
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--timeout", "30", "app_production:app"]
```

**Create Cloud Run optimized app:**
```python
# File: app_cloud_run.py
import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime
import pickle
from pathlib import Path

# Configure logging for Cloud Run
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
class CloudRunConfig:
    PORT = int(os.environ.get('PORT', 8080))
    MODEL_PATH = os.environ.get('MODEL_PATH', '/app/models')
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
    CACHE_TTL = int(os.environ.get('CACHE_TTL', 30))  # seconds

config = CloudRunConfig()

class OptimizedMLService:
    def __init__(self):
        self.model = None
        self.cache = {}
        self.model_loaded = False
        self.load_model_on_startup()

    def load_model_on_startup(self):
        """Load model at startup to reduce cold starts"""
        try:
            model_file = Path(config.MODEL_PATH) / "production_model.pkl"
            if model_file.exists():
                with open(model_file, 'rb') as f:
                    self.model = pickle.load(f)
                self.model_loaded = True
                logger.info("✅ Model loaded successfully")
            else:
                logger.warning("⚠️ No model found, using technical analysis")
                self.model_loaded = False
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            self.model_loaded = False

    def generate_prediction(self, data):
        """Generate optimized prediction"""
        symbol = data.get('symbol', 'UNKNOWN')

        # Check cache first
        cache_key = f"{symbol}:{hash(str(sorted(data.items())))}"
        if cache_key in self.cache:
            logger.info(f"Cache hit for {symbol}")
            return self.cache[cache_key]

        # Generate prediction
        if self.model_loaded:
            prediction = self.ml_predict(data)
        else:
            prediction = self.technical_predict(data)

        # Cache result (simple in-memory cache)
        self.cache[cache_key] = prediction

        # Limit cache size
        if len(self.cache) > 1000:
            self.cache.clear()

        return prediction

    def ml_predict(self, data):
        """ML-based prediction"""
        features = self.extract_features(data)
        if features is None:
            return self.technical_predict(data)

        try:
            prediction = self.model.predict_proba([features])[0]
            signal_idx = np.argmax(prediction)
            confidence = prediction[signal_idx] * 100

            signals = ['SELL', 'HOLD', 'BUY']
            signal = signals[signal_idx]

            return {
                'signal': signal,
                'confidence': confidence,
                'method': 'ML',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            return self.technical_predict(data)

    def technical_predict(self, data):
        """Technical analysis fallback"""
        rsi = data.get('rsi', 50)
        ema12 = data.get('ema12', data.get('close', 1))
        ema21 = data.get('ema21', data.get('close', 1))

        # Simple logic
        if rsi < 30 and ema12 > ema21:
            signal = 'BUY'
            confidence = 70
        elif rsi > 70 and ema12 < ema21:
            signal = 'SELL'
            confidence = 70
        else:
            signal = 'HOLD'
            confidence = 50

        return {
            'signal': signal,
            'confidence': confidence,
            'method': 'Technical Analysis',
            'timestamp': datetime.now().isoformat()
        }

    def extract_features(self, data):
        """Extract features for ML model"""
        try:
            return [
                data.get('close', 1.0),
                data.get('rsi', 50),
                data.get('ema12', data.get('close', 1.0)),
                data.get('ema21', data.get('close', 1.0)),
                data.get('atr', 0.01),
                data.get('adx', 25),
                data.get('volume', 1000),
            ]
        except:
            return None

# Initialize service
ml_service = OptimizedMLService()

@app.route('/')
def index():
    return jsonify({
        'service': 'AI Cash Evolution ML API',
        'status': 'running',
        'model_loaded': ml_service.model_loaded,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': ml_service.model_loaded,
        'cache_size': len(ml_service.cache)
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        prediction = ml_service.generate_prediction(data)

        return jsonify({
            'status': 'success',
            'prediction': prediction,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """Batch predictions for efficiency"""
    try:
        data = request.get_json()
        predictions = data.get('predictions', [])

        results = []
        for pred_data in predictions:
            result = ml_service.generate_prediction(pred_data)
            results.append(result)

        return jsonify({
            'status': 'success',
            'count': len(results),
            'predictions': results
        }), 200

    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=config.PORT, debug=False)
```

### 2. Build and Deploy

**Create build script:**
```bash
#!/bin/bash
# File: build_and_deploy.sh

set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_NAME="ai-cash-ml-api"
REPO_NAME="ml-repo"

echo "🚀 Building and deploying AI Cash Evolution ML API..."

# Create artifact registry repository
echo "📦 Creating artifact registry..."
gcloud artifacts repositories create ${REPO_NAME} \
    --repository-format=docker \
    --location=${REGION} \
    --description="ML models repository" || true

# Configure Docker authentication
echo "🔐 Configuring Docker authentication..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build image
echo "🏗️ Building Docker image..."
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

docker build -t ${IMAGE_PATH} .

# Push image
echo "📤 Pushing image..."
docker push ${IMAGE_PATH}

# Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image=${IMAGE_PATH} \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --memory=1Gi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --concurrency=80 \
    --timeout=30s \
    --set-env-vars="MODEL_PATH=/app/models,CACHE_TTL=30"

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region=${REGION} \
    --format='value(status.url)')

echo "✅ Deployment complete!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo "🔍 Test with: curl ${SERVICE_URL}/health"

# Test deployment
echo "🧪 Testing deployment..."
curl -f ${SERVICE_URL}/health || echo "❌ Health check failed"

echo "🎉 AI Cash Evolution ML API is ready!"
```

### 3. Cost Optimization Configuration

**Create cost-optimized deployment:**
```yaml
# File: cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ai-cash-ml-api
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        # Cost optimization settings
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/target: "80"
        autoscaling.knative.dev/targetUtilizationPercentage: "70"
        # Performance settings
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/execution-environment: gen2
    spec:
      containerConcurrency: 80
      timeoutSeconds: 30
      containers:
      - image: us-central1-docker.pkg.dev/PROJECT_ID/ml-repo/ai-cash-ml-api:latest
        ports:
        - containerPort: 8080
          name: http1
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
        env:
        - name: MODEL_PATH
          value: "/app/models"
        - name: CACHE_TTL
          value: "30"
        - name: LOG_LEVEL
          value: "INFO"
        # Liveness and readiness probes
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

### 4. Environment Variables Setup

**Create .env file for Cloud Run:**
```bash
# Production environment variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
OANDA_API_TOKEN=your-oanda-token
REDIS_URL=redis://your-redis-instance:6379
LOG_LEVEL=INFO
MODEL_PATH=/app/models
CACHE_TTL=30
```

**Set environment variables in Cloud Run:**
```bash
gcloud run services update ai-cash-ml-api \
    --region=us-central1 \
    --set-env-vars="SUPABASE_URL=https://your-project.supabase.co" \
    --set-env-vars="SUPABASE_SERVICE_ROLE_KEY=your-key" \
    --set-env-vars="OANDA_API_TOKEN=your-token" \
    --set-secrets="REDIS_URL=redis-url:latest"
```

### 5. Monitoring and Logging

**Create monitoring dashboard:**
```python
# File: monitoring.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from flask import Response
import time

# Metrics
prediction_counter = Counter('predictions_total', 'Total predictions', ['symbol', 'signal'])
prediction_latency = Histogram('prediction_duration_seconds', 'Prediction latency')
active_instances = Gauge('active_instances', 'Active Cloud Run instances')
cache_hits = Counter('cache_hits_total', 'Total cache hits')

# Add monitoring endpoints
@app.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype='text/plain')

# Use in prediction endpoint
@app.route('/predict', methods=['POST'])
def predict():
    start_time = time.time()

    try:
        data = request.get_json()
        result = ml_service.generate_prediction(data)

        # Update metrics
        prediction_counter.labels(
            symbol=data.get('symbol', 'UNKNOWN'),
            signal=result['signal']
        ).inc()

        return jsonify(result)
    finally:
        prediction_latency.observe(time.time() - start_time)
```

### 6. Testing the Deployment

**Create test script:**
```python
# File: test_deployment.py
import requests
import json
import time
from concurrent.futures import ThreadPoolExecutor

BASE_URL = "https://ai-cash-ml-api-xxxxx-uc.a.run.app"

def test_health():
    """Test health endpoint"""
    response = requests.get(f"{BASE_URL}/health")
    print(f"Health check: {response.status_code}")
    print(f"Response: {response.json()}")

def test_single_prediction():
    """Test single prediction"""
    data = {
        "symbol": "EURUSD",
        "close": 1.0850,
        "rsi": 45.2,
        "ema12": 1.0845,
        "ema21": 1.0840,
        "atr": 0.0020,
        "adx": 28.5,
        "volume": 1000
    }

    start_time = time.time()
    response = requests.post(f"{BASE_URL}/predict", json=data)
    duration = time.time() - start_time

    print(f"Single prediction: {response.status_code} ({duration:.3f}s)")
    print(f"Response: {response.json()}")

def test_batch_prediction():
    """Test batch prediction"""
    batch_data = []
    for i in range(10):
        batch_data.append({
            "symbol": "EURUSD",
            "close": 1.0850 + (i * 0.0001),
            "rsi": 45.2 + i,
            "ema12": 1.0845 + (i * 0.0001),
            "ema21": 1.0840 + (i * 0.0001),
            "atr": 0.0020,
            "adx": 28.5,
            "volume": 1000
        })

    start_time = time.time()
    response = requests.post(f"{BASE_URL}/batch-predict", json={"predictions": batch_data})
    duration = time.time() - start_time

    print(f"Batch prediction (10): {response.status_code} ({duration:.3f}s)")
    result = response.json()
    print(f"Processed {result.get('count', 0)} predictions")

def test_load():
    """Test load with concurrent requests"""
    def make_request():
        data = {
            "symbol": "EURUSD",
            "close": 1.0850,
            "rsi": 45.2,
            "ema12": 1.0845,
            "ema21": 1.0840,
            "atr": 0.0020,
            "adx": 28.5,
            "volume": 1000
        }
        response = requests.post(f"{BASE_URL}/predict", json=data)
        return response.status_code == 200

    start_time = time.time()
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request) for _ in range(50)]
        results = [f.result() for f in futures]

    duration = time.time() - start_time
    success_rate = sum(results) / len(results) * 100

    print(f"Load test (50 concurrent): {duration:.3f}s, {success_rate:.1f}% success")

if __name__ == "__main__":
    print("🧪 Testing AI Cash Evolution ML API")
    print("=" * 50)

    test_health()
    print()

    test_single_prediction()
    print()

    test_batch_prediction()
    print()

    test_load()
    print()

    print("✅ Testing complete!")
```

### 7. CI/CD Pipeline (GitHub Actions)

**Create GitHub workflow:**
```yaml
# File: .github/workflows/deploy-cloud-run.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  SERVICE_NAME: ai-cash-ml-api

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Google Auth
      id: auth
      uses: google-github-actions/auth@v1
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}

    - name: Setup Cloud SDK
      uses: google-github-actions/setup-gcloud@v1

    - name: Configure Docker
      run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev

    - name: Build and Push
      run: |
        IMAGE_PATH="${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/ml-repo/${{ env.SERVICE_NAME }}:${{ github.sha }}"
        docker build -t $IMAGE_PATH .
        docker push $IMAGE_PATH

    - name: Deploy to Cloud Run
      run: |
        IMAGE_PATH="${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/ml-repo/${{ env.SERVICE_NAME }}:${{ github.sha }}"
        gcloud run deploy ${{ env.SERVICE_NAME }} \
          --image=$IMAGE_PATH \
          --region=${{ env.REGION }} \
          --platform=managed \
          --allow-unauthenticated \
          --memory=1Gi \
          --cpu=1 \
          --min-instances=0 \
          --max-instances=10 \
          --set-env-vars="SUPABASE_URL=${{ secrets.SUPABASE_URL }}"
```

### 8. Cost Monitoring Setup

**Create budget alerts:**
```bash
#!/bin/bash
# File: setup_budget_monitoring.sh

BILLING_ACCOUNT_ID=$(gcloud billing accounts list --format='value(name)' | head -n 1)

# Create budget
gcloud billing budgets create \
  --billing-account=${BILLING_ACCOUNT_ID} \
  --display-name="ML Trading System Budget" \
  --budget-amount=50USD \
  --filter="services=run.googleapis.com" \
  --threshold-rule=percent=80 \
  --threshold-rule=percent=90

# Set up notification channels
EMAIL=$(gcloud config get-value account)
gcloud monitoring channels create \
  --type=email \
  --display-name="Cost Alerts" \
  --email-addresses=${EMAIL}

CHANNEL_ID=$(gcloud monitoring channels list --filter='type=email' --format='value(name)' | head -n 1)

# Create alert policy
gcloud alerting policies create \
  --condition-filter='metric.type="billing.googleapis.com/billing/cost_amount"' \
  --condition-threshold-value=40 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=${CHANNEL_ID} \
  --display-name="Cloud Run Cost Alert"
```

## Deployment Checklist

- [ ] Enable Cloud Run and related APIs
- [ ] Create Artifact Registry repository
- [ ] Optimize Dockerfile for size and performance
- [ ] Configure environment variables and secrets
- [ ] Set up monitoring and logging
- [ ] Configure auto-scaling settings
- [ ] Set up budget alerts
- [ ] Test deployment with load testing
- [ ] Configure CI/CD pipeline
- [ ] Document API endpoints and usage

## Cost Optimization Checklist

- [ ] Use min instances = 0 to scale to zero
- [ ] Implement request batching
- [ ] Add caching layer
- [ ] Optimize model loading
- [ ] Monitor performance metrics
- [ ] Set appropriate concurrency limits
- [ ] Use Cloud Run Gen2 for better performance
- [ ] Regularly review usage and costs

This deployment guide provides everything needed to deploy your ML trading system to Google Cloud Run with cost optimization and monitoring in place.