from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
import timm
import albumentations as A
from albumentations.pytorch import ToTensorV2
import cv2
import numpy as np
import base64
import os
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_PATH  = os.environ.get('MODEL_PATH', 'gem_classifier_bundle.pt')
DEVICE      = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
IMG_SIZE    = 224
CLASS_NAMES = [
    'Yellow Sapphires-Cut',
    'Yellow Sapphires-Rough',
    'Zircon Spectrum (Cut)',
    'Zircon Spectrum(Rough)'
]

# ── Model definition (must match training) ───────────────────────────────────
class GemClassifier(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        self.backbone = timm.create_model('efficientnet_b0', pretrained=False, num_classes=0)
        feat_dim = self.backbone.num_features
        self.head = nn.Sequential(
            nn.Linear(feat_dim, 512),
            nn.BatchNorm1d(512),
            nn.SiLU(),
            nn.Dropout(0.4),
            nn.Linear(512, 128),
            nn.SiLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )
    def forward(self, x):
        return self.head(self.backbone(x))

# ── Transform ─────────────────────────────────────────────────────────────────
val_transform = A.Compose([
    A.Resize(IMG_SIZE, IMG_SIZE),
    A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ToTensorV2()
])

# ── Load model ────────────────────────────────────────────────────────────────
model = None

def load_model():
    global model, CLASS_NAMES
    if not os.path.exists(MODEL_PATH):
        print(f"WARNING: Model file not found at {MODEL_PATH}")
        return False
    try:
        bundle = torch.load(MODEL_PATH, map_location=DEVICE)
        CLASS_NAMES = bundle.get('class_names', CLASS_NAMES)
        m = GemClassifier(num_classes=len(CLASS_NAMES)).to(DEVICE)
        m.load_state_dict(bundle['model_state_dict'])
        m.eval()
        model = m
        print(f"Model loaded. Classes: {CLASS_NAMES}")
        return True
    except Exception as e:
        print(f"Model load error: {e}")
        return False

def preprocess_image(img_array):
    """Preprocess a numpy RGB image for inference."""
    img_resized = cv2.resize(img_array, (IMG_SIZE, IMG_SIZE))
    tensor = val_transform(image=img_resized)['image'].unsqueeze(0).to(DEVICE)
    return tensor


# ── Rejection thresholds ──────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.75   # raised: model must be >= 75% sure
ENTROPY_THRESHOLD    = 1.00   # tightened: less tolerance for uncertain predictions


def is_likely_spectrum(img_array):
    """
    Robust heuristic checks to reject non-spectrum images BEFORE the model runs.

    A genuine gem absorption/emission spectrum image has these properties:
      1. Landscape orientation (wavelength axis runs horizontally)
      2. A continuous bright horizontal band (the dispersed light strip)
      3. Dark regions above/below the band (background / slit area)
      4. The bright band occupies a HORIZONTAL strip, not the whole image
      5. The image has a strong horizontal gradient structure —
         pixel values vary significantly along the X axis (wavelength)
         but are fairly uniform along the Y axis within the band
      6. The image is NOT a photograph of a physical gem (which would be
         roughly square-ish, uniformly bright, and have no dark band structure)

    Returns (True, None) or (False, reason_string).
    """
    h, w = img_array.shape[:2]
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY).astype(np.float32)

    # ── 1. Basic sanity ───────────────────────────────────────────────────────
    if h < 10 or w < 10:
        return False, "Image is too small"

    # ── 2. Aspect ratio — very lenient, only reject extreme portraits ────────
    # Spectra are usually landscape but can be square or mildly portrait
    # depending on crop/capture. Only reject very tall narrow images.
    aspect = w / max(h, 1)
    if aspect < 0.35:
        return False, "Image is extremely portrait-oriented — unlikely to be a spectrum"

    # ── 3. Must have meaningful brightness variation (not blank / solid) ──────
    global_std = float(gray.std())
    if global_std < 6.0:
        return False, "Image has too little contrast to be a spectrum"

    # ── 4. Must have a bright region (the light strip) ────────────────────────
    max_brightness = float(gray.max())
    if max_brightness < 30:
        return False, "Image is too dark to be a spectrum"

    # ── 5. Band structure check (relaxed) ────────────────────────────────────
    # Check BOTH row-wise and column-wise variation — if either axis shows
    # a meaningful brightness gradient the image has band-like structure.
    # This handles both landscape and portrait spectrum captures.
    row_means = gray.mean(axis=1)
    col_means = gray.mean(axis=0)
    row_std   = float(row_means.std())
    col_std   = float(col_means.std())
    if row_std < 4.0 and col_std < 4.0:
        return False, "No band structure detected along either axis (image is too uniform)"

    # ── 6. Band occupancy check (relaxed) ────────────────────────────────────
    # Only reject if the image is overwhelmingly uniformly bright AND also
    # has very low variation — i.e. a flat-lit solid object, not a spectrum.
    threshold   = max_brightness * 0.55
    bright_rows = np.sum(row_means > threshold)
    bright_frac = bright_rows / max(h, 1)
    if bright_frac > 0.90 and global_std < 15.0:
        return False, (
            f"Image appears to be a uniformly lit photo, not a spectrum "
            f"({bright_frac*100:.0f}% of rows are bright with low overall variation)"
        )

    # ── 8. Color distribution check ───────────────────────────────────────────
    # A spectrum disperses white light → it should contain a spread of hues.
    # A photo of a single-colored gem (pink sapphire, etc.) will have a very
    # narrow hue range.  We check HSV saturation AND hue spread.
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV).astype(np.float32)
    hue = hsv[:, :, 0]          # 0-180 in OpenCV
    sat = hsv[:, :, 1]          # 0-255

    # Only consider pixels bright enough to have meaningful colour
    bright_mask = gray > (max_brightness * 0.3)
    if bright_mask.sum() > 50:
        hue_in_band = hue[bright_mask]
        hue_range   = float(hue_in_band.max() - hue_in_band.min())
        mean_sat    = float(sat[bright_mask].mean())

        # Only reject very narrow hue + very high saturation + low variation combined.
        # Yellow/Zircon spectra can have moderately narrow hue ranges themselves,
        # so we use tight thresholds to avoid false rejections.
        if hue_range < 15 and mean_sat > 100 and global_std < 20.0:
            return False, (
                f"Very narrow hue range ({hue_range:.0f}°) with high saturation and low variation — "
                "looks like a single-colour gem photo, not a spectrum"
            )

    return True, None


def prediction_entropy(probs):
    """Shannon entropy of probability distribution. Uniform = log(N) ≈ 1.386 for 4 classes."""
    probs = np.clip(probs, 1e-9, 1.0)
    return float(-np.sum(probs * np.log(probs)))


def run_inference(img_array):
    """Run model inference with rejection logic."""
    if model is None:
        return None, "Model not loaded"
    try:
        # Step 1: heuristic pre-check (strong rejection gate)
        ok, reason = is_likely_spectrum(img_array)
        if not ok:
            return None, f"Not a spectrum image: {reason}"

        # Step 2: model forward pass
        tensor = preprocess_image(img_array)
        with torch.no_grad():
            out   = model(tensor)
            probs = torch.softmax(out, dim=1).cpu().numpy()[0]

        pred_idx   = int(probs.argmax())
        pred_class = CLASS_NAMES[pred_idx]
        confidence = float(probs[pred_idx])
        all_scores = {CLASS_NAMES[i]: round(float(probs[i]) * 100, 2) for i in range(len(CLASS_NAMES))}

        # Step 3: confidence threshold
        if confidence < CONFIDENCE_THRESHOLD:
            return None, (
                f"Low confidence ({confidence*100:.1f}%) — image does not clearly match "
                f"any known gem spectrum. Top guess was '{pred_class}'."
            )

        # Step 4: entropy check (flat distribution = uncertain)
        entropy = prediction_entropy(probs)
        if entropy > ENTROPY_THRESHOLD:
            return None, (
                f"Prediction too uncertain (entropy={entropy:.2f}) — "
                "this may not be a gem spectrum image."
            )

        return {
            'predicted_class': pred_class,
            'confidence': round(confidence * 100, 2),
            'all_scores': all_scores
        }, None

    except Exception as e:
        return None, str(e)

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'device': str(DEVICE),
        'classes': CLASS_NAMES
    })

@app.route('/predict/upload', methods=['POST'])
def predict_upload():
    """Predict from uploaded image file."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided. Use key: image'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400

    try:
        img_bytes = file.read()
        img_array = np.frombuffer(img_bytes, np.uint8)
        img       = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        img       = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    except Exception as e:
        return jsonify({'error': f'Image decode error: {e}'}), 400

    result, err = run_inference(img)
    if err:
        return jsonify({'error': err}), 422   # 422 = unprocessable / rejected
    return jsonify(result)

@app.route('/predict/base64', methods=['POST'])
def predict_base64():
    """Predict from base64-encoded image (for webcam frames)."""
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': 'No image in request body. Send JSON: {"image": "<base64>"}'}), 400

    try:
        b64_data = data['image']
        # Strip data URL prefix if present
        if ',' in b64_data:
            b64_data = b64_data.split(',')[1]
        img_bytes = base64.b64decode(b64_data)
        img_array = np.frombuffer(img_bytes, np.uint8)
        img       = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        img       = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    except Exception as e:
        return jsonify({'error': f'Base64 decode error: {e}'}), 400

    result, err = run_inference(img)
    if err:
        return jsonify({'error': err}), 422   # 422 = unprocessable / rejected
    return jsonify(result)

@app.route('/classes', methods=['GET'])
def get_classes():
    return jsonify({'classes': CLASS_NAMES})

# ── Start ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    load_model()
    app.run(host='0.0.0.0', port=5000, debug=False)