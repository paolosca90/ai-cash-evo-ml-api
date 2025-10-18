#!/bin/bash
# AI Cash Evolution - Cloud Run Deployment Script
# Automatic deployment with optimization

set -e

# Configuration
PROJECT_ID="ai-cash-evolution"  # Replace with your Google Cloud project ID
SERVICE_NAME="ai-cash-ml-service"
REGION="us-central1"
MEMORY="512Mi"  # Optimized for free tier
CPU="1"         # Optimized for free tier
MAX_INSTANCES="10"
MIN_INSTANCES="0"

echo "🚀 Starting AI Cash Evolution ML Service Deployment..."
echo "Platform: Google Cloud Run"
echo "Region: $REGION"
echo "Memory: $MEMORY"
echo "CPU: $CPU"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI (gcloud) is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is logged in
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "❌ Not authenticated with Google Cloud."
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set project
echo "📋 Setting project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Build and deploy
echo "🏗️ Building container image..."
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME" .

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --image "gcr.io/$PROJECT_ID/$SERVICE_NAME" \
    --region "$REGION" \
    --platform "managed" \
    --memory "$MEMORY" \
    --cpu "$CPU" \
    --min-instances "$MIN_INSTANCES" \
    --max-instances "$MAX_INSTANCES" \
    --allow-unauthenticated \
    --set-env-vars "PORT=8080" \
    --timeout "300s" \
    --concurrency "80"

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region "$REGION" \
    --format="value(status.url)")

echo "✅ Deployment successful!"
echo "🌐 Service URL: $SERVICE_URL"
echo "🔗 Health Check: $SERVICE_URL/health"
echo "📊 API Docs: $SERVICE_URL"

# Test deployment
echo "🧪 Testing deployment..."
sleep 10

# Test health endpoint
if curl -s "$SERVICE_URL/health" > /dev/null; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check failed - service might still be starting..."
fi

# Test prediction endpoint
echo "📈 Testing ML prediction..."
curl -s "$SERVICE_URL/predict?symbol=EURUSD=X" | jq '.' 2>/dev/null || echo "Prediction endpoint test completed"

echo ""
echo "🎯 Next Steps:"
echo "1. Visit: $SERVICE_URL"
echo "2. Test with: curl '$SERVICE_URL/predict?symbol=EURUSD=X'"
echo "3. Monitor in Google Cloud Console"
echo "4. Update frontend to use this URL"
echo ""
echo "💡 Integration with your dashboard:"
echo "VITE_ML_API_URL=$SERVICE_URL"

echo "🎉 AI Cash Evolution ML Service is now live on Google Cloud Run!"