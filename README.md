# 🧠 Brainify

This project is an **AI-powered Brain MRI Segmentation and Analysis Platform** designed for radiologists, neurologists, and medical researchers.
It detects and classifies brain tumors from MRI scans using a **Dual-Head Attention U-Net**, and delivers results through a full-stack **Django web application** with professional PDF clinical reports, an AI research chatbot, and live medical research feeds.

---

## 🔧 Tech Stack

- **Programming Language:** Python
- **Backend Framework:** Django 4.2+
- **Database:** PostgreSQL
- **Machine Learning & Image Processing:** TensorFlow/Keras, OpenCV, scikit-image, NumPy, Matplotlib, Nibabel
- **PDF Generation:** ReportLab, Pillow
- **AI Chatbot:** Groq API (LLaMA 3.3 70B)
- **Authentication:** Google OAuth 2.0, Django Email Verification
- **Frontend:** Django Templates, Vanilla JavaScript, CSS3
- **Other Libraries:** feedparser, BeautifulSoup4, requests, python-dotenv, Joblib

---

## 📌 Features

- Accepts MRI scans in **TIFF, PNG, JPG, DICOM** formats with full patient metadata
- Preprocesses images using **CLAHE contrast enhancement**, Gaussian blur, and brain extraction via morphological operations
- Runs a **Dual-Head Attention U-Net** (trained on BraTS 2020) for simultaneous:
  - **Segmentation:** binary tumor mask (128×128)
  - **Classification:** No Tumor / LGG (Low-Grade Glioma) / HGG (High-Grade Glioma)
- Reports full metrics: **Dice Score, IoU, Accuracy, Precision, Recall, F1**
- Generates professional **clinical PDF reports** (ReportLab) with overlay images, heatmaps, WHO grading, and severity classification
- **AI Research Chatbot** powered by Groq (LLaMA 3.3 70B) with two modes: Report Analysis and Medical Research
- **Live Medical Research Feed** aggregating Reddit, PubMed, Google News, and ClinicalTrials.gov
- **Multi-role user system** (Radiologist, Neurologist, Technician, Researcher, Admin) with email verification and Google OAuth
- **Admin analytics panel** with system-wide metrics, user management, and audit trails
- **Dashboard** showing scan trends, severity distributions, login history, and personal metrics
- **Bulk operations**: view multiple scan results and download all PDF reports as a ZIP
- **7 brain-training cognitive games** (Memory Match, Simon Says, Number Memory, and more)
- Demo mode simulates AI results when TensorFlow is unavailable — no broken features

---

## 🚀 How to Run

### 1️⃣ Clone the repository and navigate into it

```
git clone https://github.com/PranavSharma195/Brainify.git
cd Brainify
```

### 2️⃣ Install required packages

```
pip install -r requirements.txt
```

### 3️⃣ Configure environment variables

Create a `.env` file in the root directory and add:

```
SECRET_KEY=your-django-secret-key
DEBUG=True
GROQ_API_KEY=gsk_...
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### 4️⃣ Set up the database

```
python manage.py migrate
python manage.py createsuperuser
```

### 5️⃣ Run the development server

```
python manage.py runserver
```

Then open **http://127.0.0.1:8000/** in your browser.

---

## 🏋️ Training the Model (Optional)

The trained model `brain_tumor_unet.h5` is included in `core/`. To retrain from scratch:

```
jupyter notebook training/train_brain_tumor.ipynb
```

This downloads the **BraTS 2020 dataset** (~4.5 GB via Kaggle API), trains the Attention U-Net for 50 epochs (~2–3 hours), and saves the model to `core/brain_tumor_unet.h5`.

---

## 📁 Project Structure

```
Brainify/
├── brainify/                        - Django project configuration
│   ├── settings.py                  - Database, email, OAuth, static file settings
│   ├── urls.py                      - Root URL router
│   └── wsgi.py                      - WSGI application entry point
│
├── core/                            - Main Django application
│   ├── models.py                    - 9 ORM models (UserProfile, MRIScan, SegmentationResult, Report, etc.)
│   ├── views.py                     - 42+ view functions (auth, upload, analysis, chatbot, games, admin)
│   ├── urls.py                      - 42 URL routes
│   ├── ml_model.py                  - Full ML pipeline (preprocessing, segmentation, classification, metrics)
│   ├── report_generator.py          - ReportLab clinical PDF generation
│   ├── email_utils.py               - Email verification, SMTP validation, token management
│   ├── middleware.py                 - Login history tracking middleware
│   ├── utils.py                     - Helper utilities
│   ├── brain_tumor_unet.h5          - Trained Attention U-Net model (36 MB)
│   ├── brain_tumor_unet_metadata.json - Model training metadata
│   ├── migrations/                  - Database migration files
│   ├── templatetags/                - Custom Django template tags
│   ├── templates/core/              - 30 HTML templates (landing, upload, analysis, dashboard, chatbot, games, etc.)
│   └── static/core/                 - CSS and JavaScript assets
│
├── training/
│   ├── train_brain_tumor.ipynb      - Main model training notebook (BraTS 2020)
│   ├── train_local_m2.ipynb         - Apple Silicon optimised training notebook
│   └── INSTRUCTIONS.md             - Step-by-step training guide
│
├── media/                           - Runtime user uploads and generated result images
├── staticfiles/                     - Collected static assets (Django admin)
├── manage.py                        - Django CLI
├── requirements.txt                 - Python dependencies
├── .env                             - Environment variables (secrets — not committed)
├── SETUP.txt                        - Installation and feature guide
└── README.md                        - This documentation file
```

---

## 📈 Future Improvements

- Train on larger, more diverse MRI datasets to improve generalisation across scanner types and populations
- Extend the model to support **3D volumetric MRI segmentation** (full NIfTI volumes, not just 2D slices)
- Add support for **multi-class tumour segmentation** (oedema, enhancing tumour, necrotic core)
- Integrate with **DICOM PACS systems** for direct hospital network compatibility
- Deploy as a **production-ready web service** with Gunicorn, Nginx, and AWS S3 media storage
- Implement **HIPAA-compliant data handling** with encrypted storage and access controls
- Add **model explainability tools** (Grad-CAM, SHAP) for clinician-facing visual explanations
- Support **longitudinal scan comparison** to track tumour progression over time
- Expand the chatbot with **fine-tuned medical knowledge** specific to neuro-oncology
- Build a **mobile-friendly UI** for tablet use in clinical environments
- Introduce **REST API endpoints** for integration with third-party clinical software
- Add **automated radiologist alerts** via email or SMS when high-severity tumours are detected

---

## 🤝 Contributions

Feel free to fork the repository and open a pull request to improve the models, features, or application design.

---

## 📬 Contact

Created by **Pranav Sharma** – feel free to reach out!
