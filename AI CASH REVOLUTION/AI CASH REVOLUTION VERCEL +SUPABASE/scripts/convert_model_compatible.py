"""
Convert existing ML model to compatible format for Railway
"""

import pickle
from pathlib import Path

print("[*] Loading existing model...")

# Load the existing model
model_path = Path("ml_models/model_20251008_223513.pkl")

with open(model_path, 'rb') as f:
    model = pickle.load(f)

print("[+] Model loaded successfully")
print(f"   Model type: {type(model)}")

# Save with protocol 4 (compatible with Python 3.4+)
output_dir = Path("ml_models_compatible")
output_dir.mkdir(exist_ok=True)

output_path = output_dir / "model.pkl"

with open(output_path, 'wb') as f:
    pickle.dump(model, f, protocol=4)

print(f"\n[+] Model saved with protocol 4:")
print(f"   {output_path}")
print(f"   Size: {output_path.stat().st_size / 1024:.1f} KB")

print("\n[*] Testing model load...")
with open(output_path, 'rb') as f:
    test_model = pickle.load(f)
print("[+] Model loads successfully!")

print("\n[*] Ready to deploy to Railway!")
print(f"   Copy {output_path} to ML API repository")
