# Main ML API
web: python -m uvicorn app:app --host 0.0.0.0 --port $PORT

# Auto Signal Generator (background worker)
signal_generator: python services/auto_signal_generator_service.py

# Weight Optimizer (background worker)
weight_optimizer: python services/weight_optimizer_service.py
