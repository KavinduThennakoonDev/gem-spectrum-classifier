# 💎 GemScan — Gem Absorption Spectrum Classifier

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Flask-3.1.3-000000?style=for-the-badge&logo=flask&logoColor=white"/>
  <img src="https://img.shields.io/badge/PyTorch-2.6+-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white"/>
  <img src="https://img.shields.io/badge/EfficientNet--B0-timm-blue?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge"/>
</p>

<p align="center">
  An AI-powered REST API that classifies gem absorption spectra into four categories using a fine-tuned <strong>EfficientNet-B0</strong> deep learning model.
</p>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Supported Classes](#-supported-classes)
- [Project Structure](#-project-structure)
- [Model Architecture](#-model-architecture)
- [API Endpoints](#-api-endpoints)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Training](#-training)
- [Tech Stack](#-tech-stack)

---

## 🔍 Overview

GemScan identifies gem types from their **absorption spectrum images** captured through a spectrometer. It provides:

- **Smart rejection logic** — automatically rejects non-spectrum images (gem photos, blank images, solid-colour inputs) before hitting the model
- **Confidence gating** — low-confidence and high-entropy predictions are rejected with a clear reason
- **REST API** — accepts both file uploads and base64-encoded images (webcam/live capture ready)
- **Docker support** — production-ready containerised deployment

---

## 💎 Supported Classes

| Class | Type |
|---|---|
| Yellow Sapphires — Cut | Absorption Spectrum |
| Yellow Sapphires — Rough | Absorption Spectrum |
| Zircon Spectrum — Cut | Absorption Spectrum |
| Zircon Spectrum — Rough | Absorption Spectrum |

---

## 📁 Project Structure

```
gem-spectrum-classifier/
├── backend/
│   ├── app.py                              # Flask REST API
│   ├── requirements.txt                    # Python dependencies
│   ├── Dockerfile                          # Container definition
│   ├── gem_classifier_bundle.pt            # Trained model bundle (not in repo)
│   └── README.md
├── frontend/                               # Frontend application
├── frontend-old/                           # Legacy frontend
└── README.md
```

---

## 🧠 Model Architecture

```
Input Image (224×224)
       │
EfficientNet-B0 Backbone (pretrained, ImageNet)
       │  1280-dim feature vector
       │
Linear(1280 → 512) → BatchNorm → SiLU → Dropout(0.4)
       │
Linear(512 → 128) → SiLU → Dropout(0.2)
       │
Linear(128 → 4)
       │
Softmax → Predicted Class + Confidence
```

- **Total parameters:** ~4.7M trainable
- **Loss:** Focal Loss with class weights + label smoothing
- **Training augmentation:** Brightness/contrast, hue shift, Gaussian noise, coarse dropout, grid distortion, MixUp
- **Inference:** Test-Time Augmentation (TTA ×8) for robust predictions

---

## 🚀 API Endpoints

### `GET /health`
Returns model status and loaded classes.

```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cuda",
  "classes": ["Yellow Sapphires-Cut", "Yellow Sapphires-Rough", "Zircon Spectrum (Cut)", "Zircon Spectrum(Rough)"]
}
```

---

### `POST /predict/upload`
Upload a spectrum image file directly.

```bash
curl -X POST http://localhost:5000/predict/upload \
  -F "image=@your_spectrum.jpg"
```

**Response:**
```json
{
  "predicted_class": "Zircon Spectrum (Cut)",
  "confidence": 87.43,
  "all_scores": {
    "Yellow Sapphires-Cut": 4.21,
    "Yellow Sapphires-Rough": 2.15,
    "Zircon Spectrum (Cut)": 87.43,
    "Zircon Spectrum(Rough)": 6.21
  }
}
```

---

### `POST /predict/base64`
Send a base64-encoded image (suitable for webcam/live capture).

```bash
curl -X POST http://localhost:5000/predict/base64 \
  -H "Content-Type: application/json" \
  -d '{"image": "<base64_string>"}'
```

---

### `GET /classes`
Returns the list of supported gem classes.

---

## ⚙️ Getting Started

### Prerequisites
- Python 3.10+
- `gem_classifier_bundle.pt` model file (generated from the training notebook)

### 1. Clone the repository
```bash
git clone https://github.com/KavinduThennakoonDev/gem-spectrum-classifier.git
cd gem-spectrum-classifier/backend
```

### 2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Place your model file
```bash
# Copy your trained model bundle into the backend folder
cp /path/to/gem_classifier_bundle.pt .
```

### 5. Run the server
```bash
python app.py
```

The API will be available at `http://localhost:5000`.

---

### 🐳 Docker

```bash
# Build
docker build -t gemscan-backend .

# Run
docker run -p 5000:5000 -v $(pwd)/gem_classifier_bundle.pt:/app/gem_classifier_bundle.pt gemscan-backend
```

---

## 🔐 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MODEL_PATH` | `gem_classifier_bundle.pt` | Path to the trained model bundle |

---

## 🏋️ Training

The model is trained using the provided Colab notebook `Gem_Spectrum_Classifier_v3_fixed.ipynb`.

**Dataset requirements:**
```
gem_dataset/
├── Yellow Sapphires-Cut/      # ~169 images
├── Yellow Sapphires-Rough/    # ~11 images (collect more for best results)
├── Zircon Spectrum (Cut)/     # ~84 images
└── Zircon Spectrum(Rough)/    # ~136 images
```

**Key training features:**
- Stratified train/val split (guarantees all classes in validation)
- Focal Loss to handle class imbalance
- MixUp augmentation for minority class generalisation
- Early stopping (patience = 10 epochs)
- WeightedRandomSampler for balanced batch composition

> ⚠️ The model file `gem_classifier_bundle.pt` is not included in this repository due to file size. Run the training notebook to generate it.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| API Framework | Flask 3.1.3 |
| Deep Learning | PyTorch 2.6+ |
| Model Backbone | EfficientNet-B0 via timm |
| Image Processing | OpenCV, Albumentations |
| Deployment | Gunicorn + Docker |
| Training Environment | Google Colab (GPU) |

---

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">Built by <a href="https://github.com/KavinduThennakoonDev">KavinduThennakoonDev</a></p>
