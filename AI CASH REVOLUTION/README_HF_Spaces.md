# Deploy to Hugging Face Spaces - Completely Free ML Hosting

## Setup Instructions:

### 1. Create Hugging Face Space
1. Go to https://huggingface.co/spaces
2. Click "Create new Space"
3. Choose: **Gradio** (Python + Web UI)
4. Space name: `ai-trading-signals`
5. Make it **Public** (free tier)
6. Hardware: **CPU basic** (free)

### 2. Upload Files
Create these files in your Space:

#### `requirements.txt`
```
gradio==4.0.0
pandas==2.0.0
numpy==1.24.0
scikit-learn==1.3.0
requests==2.31.0
joblib==1.3.0
```

#### `app.py` (copy from huggingface_space_app.py)

### 3. Deploy Benefits:
- ✅ **Completely Free**: No hosting costs
- ✅ **Public URL**: Shareable link for your trading signals
- ✅ **Real-time Predictions**: API accessible from your main app
- ✅ **No Server Management**: Hugging Face handles everything
- ✅ **Custom Domain**: Can connect your own domain later
- ✅ **GPU Upgrade**: Available for $0.10/hour if needed

### 4. Access Your Model:
Your deployed model will be available at:
`https://your-username-ai-trading-signals.hf.space`

### 5. API Integration:
```javascript
// Call your Hugging Face Space API from your main app
async function getTradingSignals(symbols) {
  const response = await fetch('https://your-space.hf.space/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: symbols })
  })

  return await response.json()
}
```

### 6. Alternative: Use as API-only
Modify the Gradio app to provide REST API endpoints instead of UI.

## Free Tier Limits:
- **CPU**: Basic CPU (sufficient for trading models)
- **Memory**: Usually 2-4GB
- **Storage**: 10GB+
- **Bandwidth**: Unlimited
- **Requests**: No strict limits
- **Uptime**: Good for trading purposes