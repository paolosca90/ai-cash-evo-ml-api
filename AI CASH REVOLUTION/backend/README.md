# Backend - AI Cash Revolution

Backend services for AI Cash Revolution including Supabase Edge Functions and serverless APIs.

## Directory Structure

```
backend/
├── supabase/          # Supabase backend
│   ├── functions/    # Edge Functions
│   └── config.toml   # Supabase configuration
└── api/              # Vercel serverless APIs
    └── ml/           # ML prediction endpoints
```

## Supabase Backend

### Edge Functions

Supabase Edge Functions run on Deno runtime at the edge, close to users.

**Location:** `supabase/functions/`

**Common functions:**
- `generate-ai-signals` - Generate AI-powered trading signals
- `execute-trade` - Execute trades via MT5 bridge
- `calculate-indicators` - Calculate technical indicators
- `manage-positions` - Manage open positions

### Deploying Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy generate-ai-signals

# List deployed functions
supabase functions list
```

### Function Structure

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Function logic here
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### Environment Variables

Set in Supabase dashboard or via CLI:

```bash
supabase secrets set API_KEY=your_key
```

### Local Development

```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve generate-ai-signals --no-verify-jwt

# Test function
curl -i http://localhost:54321/functions/v1/generate-ai-signals \
  -X POST \
  -H "Content-Type: application/json" \
  --data '{"symbol":"EURUSD"}'
```

## Vercel Serverless APIs

### ML Prediction API

Python-based serverless functions for ML predictions.

**Location:** `api/ml/`

**Files:**
- `ml_prediction_api.py` - Main prediction endpoint
- `ml_prediction_service.py` - Prediction service logic
- `requirements.txt` - Python dependencies

### Deploying to Vercel

```bash
# Deploy all functions
vercel --prod

# Deploy specific API
vercel --prod api/ml
```

### API Configuration

Create `api/ml/vercel.json`:

```json
{
  "runtime": "python3.9",
  "maxDuration": 10
}
```

### Python API Structure

```python
# api/ml/predict.py
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/ml/predict', methods=['POST'])
def predict():
    data = request.get_json()
    # Prediction logic
    return jsonify({"prediction": "BUY", "confidence": 0.85})
```

### Environment Variables

Set in Vercel dashboard or `.env`:

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
```

## Database Access

Both Supabase Functions and Vercel APIs connect to Supabase PostgreSQL:

### From Edge Function (Deno)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const { data, error } = await supabase
  .from('trading_signals')
  .select('*')
```

### From Vercel API (Python)

```python
from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

response = supabase.table('trading_signals').select('*').execute()
```

## API Endpoints

### Edge Functions

Base URL: `https://[PROJECT-REF].supabase.co/functions/v1/`

```
POST /generate-ai-signals
POST /execute-trade
POST /calculate-indicators
GET  /get-signals
```

### Vercel APIs

Base URL: `https://your-project.vercel.app/api/`

```
POST /ml/predict
GET  /ml/performance
GET  /ml/weights
```

## Authentication

### Supabase Functions

```typescript
// Require authentication
const authHeader = req.headers.get('Authorization')!
const token = authHeader.replace('Bearer ', '')
const { data: { user } } = await supabase.auth.getUser(token)
```

### Vercel APIs

```python
# Verify API key
api_key = request.headers.get('X-API-Key')
if api_key != os.getenv('API_KEY'):
    return jsonify({"error": "Unauthorized"}), 401
```

## Monitoring

### Supabase Logs
Access in Supabase dashboard:
- Functions → Logs
- Real-time function invocations
- Error tracking

### Vercel Logs
Access in Vercel dashboard:
- Deployments → Functions
- Request logs
- Error monitoring

## Error Handling

### Edge Function

```typescript
try {
  // Function logic
  return new Response(JSON.stringify({ success: true }))
} catch (error) {
  console.error('Error:', error)
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 500 }
  )
}
```

### Vercel API

```python
try:
    # API logic
    return jsonify({"success": True})
except Exception as e:
    logging.error(f"Error: {str(e)}")
    return jsonify({"error": str(e)}), 500
```

## Testing

### Edge Function Tests

```bash
# Using Deno test
deno test supabase/functions/my-function/test.ts
```

### API Tests

```bash
# Using pytest
pytest api/ml/test_predict.py
```

## Performance

- **Edge Functions**: 50ms-200ms typical response time
- **Vercel APIs**: 100ms-500ms depending on computation
- **Cold starts**: ~1-3 seconds for both platforms

## Scaling

### Supabase
- Auto-scales with requests
- Rate limiting available
- Configure in project settings

### Vercel
- Serverless auto-scaling
- Configurable concurrency
- Set in `vercel.json`

## Related Documentation

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- Project structure: `../PROJECT_STRUCTURE.md`
- API docs: `../docs/api/`
