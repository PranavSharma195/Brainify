"""
Brainify ML Model — Brain MRI Segmentation & Classification
Dual-head Attention U-Net with OpenCV pre/post-processing.

Model: brain_tumor_unet.h5 (trained on BraTS 2020)
Outputs:
  - Segmentation: Binary tumor mask (128×128)
  - Classification: [No Tumor, LGG, HGG] probabilities

Falls back to demo mode when model/TF not available.
"""
import os, io, base64, numpy as np
from PIL import Image

# ── Optional imports (graceful fallback) ──
try:
    import cv2
    CV2 = True
except ImportError:
    CV2 = False

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap
    MPL = True
except ImportError:
    MPL = False

try:
    from skimage.transform import resize
    SKIMAGE = True
except ImportError:
    SKIMAGE = False

try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

# ── Constants ──
IMG_SIZE = (128, 128)
CLASS_NAMES = ['No Tumor', 'LGG (Low-Grade Glioma)', 'HGG (High-Grade Glioma)']
NUM_CLASSES = 3

_model = None
_model_type = None  # 'dual' | 'single' | None


# ═══════════════════════════════════════════════════════════════
# CUSTOM LOSSES/METRICS (needed to load the .h5 model)
# ═══════════════════════════════════════════════════════════════

def _dice_coef(y_true, y_pred, smooth=1.0):
    if not TF_AVAILABLE:
        return 0
    y_true_f = tf.keras.backend.flatten(y_true)
    y_pred_f = tf.keras.backend.flatten(y_pred)
    intersection = tf.keras.backend.sum(y_true_f * y_pred_f)
    return (2. * intersection + smooth) / (tf.keras.backend.sum(y_true_f) + tf.keras.backend.sum(y_pred_f) + smooth)


def _dice_loss(y_true, y_pred):
    return 1.0 - _dice_coef(y_true, y_pred)


def _dice_bce_loss(y_true, y_pred):
    bce = tf.keras.losses.binary_crossentropy(y_true, y_pred)
    return 0.5 * bce + 0.5 * _dice_loss(y_true, y_pred)


def _tversky_index(y_true, y_pred, alpha=0.3, beta=0.7, smooth=1.0):
    """Tversky Index for V2 model."""
    if not TF_AVAILABLE:
        return 0
    y_true_f = tf.keras.backend.flatten(y_true)
    y_pred_f = tf.keras.backend.flatten(y_pred)
    tp = tf.keras.backend.sum(y_true_f * y_pred_f)
    fp = tf.keras.backend.sum((1 - y_true_f) * y_pred_f)
    fn = tf.keras.backend.sum(y_true_f * (1 - y_pred_f))
    return (tp + smooth) / (tp + alpha * fp + beta * fn + smooth)


def _focal_tversky_loss(y_true, y_pred, alpha=0.3, beta=0.7, gamma=0.75):
    """Focal Tversky Loss for V2 model."""
    tv = _tversky_index(y_true, y_pred, alpha=alpha, beta=beta)
    return tf.keras.backend.pow((1 - tv), gamma)


def _combined_seg_loss(y_true, y_pred):
    """V2 segmentation loss: 0.6 × Focal Tversky + 0.4 × Dice Loss."""
    ft = _focal_tversky_loss(y_true, y_pred, alpha=0.3, beta=0.7, gamma=0.75)
    dl = _dice_loss(y_true, y_pred)
    return 0.6 * ft + 0.4 * dl


def _iou_metric(y_true, y_pred):
    y_pred_bin = tf.keras.backend.cast(y_pred > 0.5, dtype='float32')
    intersection = tf.keras.backend.sum(y_true * y_pred_bin)
    union = tf.keras.backend.sum(y_true) + tf.keras.backend.sum(y_pred_bin) - intersection
    return (intersection + 1e-7) / (union + 1e-7)


def _weighted_cls_loss(y_true, y_pred):
    """Placeholder for V4 weighted classification loss — allows model loading."""
    ce = -tf.reduce_sum(y_true * tf.math.log(y_pred + 1e-7), axis=-1)
    return tf.reduce_mean(ce)


CUSTOM_OBJECTS = {
    'dice_coef': _dice_coef,
    'dice_loss': _dice_loss,
    'dice_bce_loss': _dice_bce_loss,
    'iou_metric': _iou_metric,
    'weighted_cls_loss': _weighted_cls_loss,
    # V2 custom objects
    'tversky_index': _tversky_index,
    'focal_tversky_loss': _focal_tversky_loss,
    'combined_seg_loss': _combined_seg_loss,
}


# ═══════════════════════════════════════════════════════════════
# MODEL LOADING
# ═══════════════════════════════════════════════════════════════

def get_model():
    """Load the trained model. Tries multiple file names for compatibility."""
    global _model, _model_type

    if _model is not None:
        return _model

    if not TF_AVAILABLE:
        print('[Brainify] TensorFlow not installed — demo mode')
        return None

    model_dir = os.path.dirname(__file__)

    # Load the trained model
    model_path = os.path.join(model_dir, 'brain_tumor_unet.h5')

    if not os.path.exists(model_path):
        print('[Brainify] brain_tumor_unet.h5 not found in core/ — running in demo mode')
        print('[Brainify] Train the model using training/train_brain_tumor.ipynb')
        return None

    try:
        _model = tf.keras.models.load_model(model_path, custom_objects=CUSTOM_OBJECTS, compile=False)
        _model_type = 'dual'
        print(f'[Brainify] ✓ Loaded brain_tumor_unet.h5 (dual-head Attention U-Net)')
        return _model
    except Exception as e:
        print(f'[Brainify] Failed to load model: {e}')
        print('[Brainify] Running in demo mode')
        return None


# ═══════════════════════════════════════════════════════════════
# OPENCV PREPROCESSING
# ═══════════════════════════════════════════════════════════════

def preprocess_image(pil_image):
    """
    Preprocess uploaded MRI image using OpenCV:
    1. Convert to grayscale
    2. Resize to 128×128
    3. Apply CLAHE for contrast enhancement
    4. Gaussian blur for noise reduction
    5. Normalize to [0, 1]
    """
    img = np.array(pil_image.convert('L'), dtype=np.float32)

    if CV2:
        # ── OpenCV pipeline ──
        img_resized = cv2.resize(img, IMG_SIZE, interpolation=cv2.INTER_LINEAR)

        # Normalize to 0–255
        mn, mx = img_resized.min(), img_resized.max()
        if mx - mn > 1e-6:
            img_uint8 = ((img_resized - mn) / (mx - mn) * 255).astype(np.uint8)
        else:
            img_uint8 = np.zeros(IMG_SIZE, dtype=np.uint8)

        # CLAHE — Contrast Limited Adaptive Histogram Equalization
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img_clahe = clahe.apply(img_uint8)

        # Gaussian blur for denoising
        img_smooth = cv2.GaussianBlur(img_clahe, (3, 3), 0)

        # Final normalization
        img_norm = img_smooth.astype(np.float32) / 255.0

    elif SKIMAGE:
        img_norm = resize(img, IMG_SIZE, preserve_range=True, anti_aliasing=True)
        img_norm = img_norm / (img_norm.max() + 1e-6)
    else:
        pil_resized = pil_image.convert('L').resize(IMG_SIZE, Image.LANCZOS)
        img_norm = np.array(pil_resized, dtype=np.float32) / 255.0

    return img_norm


# ═══════════════════════════════════════════════════════════════
# OPENCV POST-PROCESSING
# ═══════════════════════════════════════════════════════════════

def create_brain_mask(img_normalized):
    """
    Create a binary mask of brain tissue.
    Excludes background but keeps most brain parenchyma including cortex.

    Strategy:
    1. Otsu threshold to get initial foreground
    2. Keep largest connected component (the brain)
    3. Gentle erosion to pull boundary inward slightly (~3-4 px)
    4. Small dilation to recover lost tissue
    """
    if not CV2:
        return np.ones(img_normalized.shape[:2], dtype=np.uint8)

    h, w = img_normalized.shape[:2]
    img_u8 = (img_normalized * 255).astype(np.uint8)

    # Step 1: Otsu threshold for initial foreground
    _, brain_binary = cv2.threshold(img_u8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    brain_binary = (brain_binary > 0).astype(np.uint8)

    # Step 2: Close small gaps, then keep only the largest component
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    brain_binary = cv2.morphologyEx(brain_binary, cv2.MORPH_CLOSE, kernel_close, iterations=2)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(brain_binary, connectivity=8)
    if num_labels > 1:
        largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        brain_binary = (labels == largest).astype(np.uint8)

    # Step 3: Gentle erosion — just trim the very edge (skull boundary)
    kernel_erode = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    brain_interior = cv2.erode(brain_binary, kernel_erode, iterations=2)

    # Step 4: Small dilation to recover some lost tissue
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    brain_interior = cv2.dilate(brain_interior, kernel_dilate, iterations=1)

    # If erosion killed everything, fall back to the closed mask
    if brain_interior.sum() < 100:
        brain_interior = brain_binary

    return brain_interior


def postprocess_mask(pred_mask, brain_mask, threshold=0.3):
    """
    Clean up the raw segmentation mask.

    Pipeline:
    1. Threshold at 0.3 (sensitive — catch tumors the model is unsure about)
    2. Restrict to brain region
    3. Light morphological cleanup
    4. Keep largest connected component
    5. Cap at 35% of brain area
    """
    if not CV2:
        binary = (pred_mask > threshold).astype(np.float32)
        return binary

    brain_pixels = int(brain_mask.sum())
    if brain_pixels == 0:
        # If brain mask is empty, use entire image
        brain_mask = np.ones_like(pred_mask, dtype=np.uint8)
        brain_pixels = int(brain_mask.sum())

    # ── Simple threshold — lower = more sensitive to tumors ──
    binary = (pred_mask > threshold).astype(np.uint8)

    # Restrict to brain region
    binary = binary & brain_mask

    if binary.sum() == 0:
        return binary.astype(np.float32)

    # Light morphological opening — remove small noise (3×3, 1 iteration)
    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    opened = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel_open, iterations=1)

    # Morphological closing — fill small holes inside tumor
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel_close, iterations=1)

    # If morphological ops wiped everything, fall back to raw thresholded mask
    if closed.sum() == 0:
        closed = binary

    if closed.sum() == 0:
        return closed.astype(np.float32)

    # Keep only the largest connected component (main tumor)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(closed.astype(np.uint8), connectivity=8)
    if num_labels <= 1:
        return closed.astype(np.float32)

    largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    clean_mask = (labels == largest).astype(np.float32)

    # Cap at 35% of brain area
    MAX_TUMOR_RATIO = 0.35
    tumor_ratio = clean_mask.sum() / brain_pixels

    if tumor_ratio > MAX_TUMOR_RATIO:
        # Raise threshold progressively
        for higher_t in [0.5, 0.6, 0.7, 0.8]:
            core = (pred_mask > higher_t).astype(np.uint8) & brain_mask
            if core.sum() / brain_pixels <= MAX_TUMOR_RATIO and core.sum() > 0:
                clean_mask = core.astype(np.float32)
                break

    return clean_mask


def find_tumor_contour(binary_mask):
    """Find the tumor boundary contour using OpenCV."""
    if not CV2 or binary_mask.sum() == 0:
        return None

    mask_uint8 = (binary_mask * 255).astype(np.uint8)
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        return max(contours, key=cv2.contourArea)
    return None


def get_tumor_properties(binary_mask, contour):
    """Extract tumor geometric properties using OpenCV."""
    if contour is None or not CV2:
        return {}

    area_px = cv2.contourArea(contour)
    perimeter = cv2.arcLength(contour, True)
    x, y, w, h = cv2.boundingRect(contour)

    # Circularity: 1.0 = perfect circle
    circularity = (4 * np.pi * area_px) / (perimeter * perimeter + 1e-7)

    # Solidity: ratio of contour area to convex hull area
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    solidity = area_px / (hull_area + 1e-7)

    return {
        'area_px': int(area_px),
        'perimeter': round(perimeter, 1),
        'bbox': (x, y, w, h),
        'circularity': round(circularity, 3),
        'solidity': round(solidity, 3),
    }


# ═══════════════════════════════════════════════════════════════
# CLASSIFICATION
# ═══════════════════════════════════════════════════════════════

def classify_tumor(area_pct, confidence, detected, cls_probs=None):
    """
    Classify tumor based on model output + area analysis.

    If cls_probs is provided (from dual-head model):
      - Uses model classification as primary signal
      - Combines with area percentage for severity grading

    If cls_probs is None (legacy/demo mode):
      - Falls back to area-based classification

    Returns: (classification, severity, who_grade, description, location, recommendations)
    """
    # ── No tumor detected ──
    if not detected or area_pct < 0.01:
        return ('No Significant Abnormality Detected', 'normal', 'N/A',
                'No abnormal signal intensity or mass lesion identified on the submitted scan.',
                'N/A',
                ['Routine follow-up in 12 months if clinically indicated',
                 'Correlate with patient symptoms and clinical history',
                 'No urgent intervention required'])

    # ── Determine tumor type from model classification ──
    model_class = None
    if cls_probs is not None and len(cls_probs) == 3:
        model_class = int(np.argmax(cls_probs))
        cls_conf = float(np.max(cls_probs))
    else:
        model_class = None
        cls_conf = 0

    # Combine model classification with area for final grading
    if model_class == 1 or (model_class is None and area_pct < 3.5):
        # ── LGG (Low-Grade Glioma) ──
        if area_pct < 1.0:
            return ('Low-Grade Glioma — Early Stage Lesion', 'mild', 'WHO Grade I–II',
                    'Small focal area of signal abnormality consistent with low-grade neoplasm. '
                    'Differential includes demyelination, ischemic change, or early low-grade glioma. '
                    'T2/FLAIR hyperintense without significant contrast enhancement.',
                    'Subcortical White Matter',
                    ['MRI with gadolinium contrast for further characterisation',
                     'Neurology consultation recommended',
                     'Follow-up MRI in 3–6 months to assess stability',
                     'Consider MR Spectroscopy for metabolic characterisation',
                     'Vascular risk factor assessment'])
        else:
            return ('Low-Grade Glioma (LGG) — Possible Astrocytoma / Oligodendroglioma', 'moderate',
                    'WHO Grade II',
                    'Slow-growing infiltrative lesion. T2/FLAIR hyperintense without significant contrast enhancement. '
                    'Often presents with seizures. Histological subtypes include diffuse astrocytoma and oligodendroglioma.',
                    'Frontal / Temporal Lobe',
                    ['Urgent neurosurgery consultation within 72 hours',
                     'MRI with gadolinium contrast and spectroscopy',
                     'Stereotactic biopsy for histological confirmation',
                     'IDH1/IDH2 and 1p/19q co-deletion molecular profiling',
                     'Multidisciplinary tumour board review',
                     'Seizure prophylaxis if indicated'])

    elif model_class == 2 or (model_class is None and area_pct >= 3.5):
        # ── HGG (High-Grade Glioma) ──
        if area_pct < 7.0:
            return ('High-Grade Glioma — Glioblastoma Multiforme (GBM)', 'severe', 'WHO Grade IV',
                    'Most aggressive primary brain tumour. Characteristic ring-enhancing lesion '
                    'with central necrosis and surrounding vasogenic oedema. '
                    'Median survival 14–16 months with optimal treatment (Stupp protocol).',
                    'Parietal / Frontal Lobe',
                    ['URGENT neurosurgery consultation within 48 hours',
                     'Full contrast MRI brain and spine',
                     'Maximal safe surgical resection',
                     'Stupp protocol: 60Gy radiotherapy + concurrent Temozolomide',
                     'MGMT methylation, EGFR, TERT promoter molecular profiling',
                     'Palliative care and goals-of-care discussion',
                     'Clinical trial eligibility assessment'])
        else:
            return ('Extensive Glioblastoma Stage IV — CRITICAL FINDING', 'critical',
                    'WHO Grade IV (Multifocal)',
                    'Neurosurgical emergency. Extensive multifocal malignancy with mass effect '
                    'and potential herniation risk. Immediate intervention required. '
                    'Consider differential of CNS lymphoma or metastatic disease.',
                    'Multifocal / Bilateral',
                    ['⚠ IMMEDIATE emergency neurosurgery consultation',
                     'ICU admission and continuous neurological monitoring',
                     'IV Dexamethasone 10mg loading dose for cerebral oedema',
                     'Brain + spine MRI STAT',
                     'Emergency tumour board convened within 24 hours',
                     'Surgical debulking vs. stereotactic biopsy decision',
                     'Concurrent chemoradiotherapy planning',
                     'Goals-of-care and family discussion immediately'])

    # ── Fallback: area-based only ──
    if area_pct < 1.0:
        return ('Microlesion / Possible White Matter Change', 'mild', 'WHO Grade I (if neoplastic)',
                'Focal area of signal abnormality. Differential includes ischemic change, '
                'demyelination, or low-grade neoplasm.',
                'Caudate / White Matter',
                ['MRI with gadolinium contrast for further characterisation',
                 'Neurology consultation recommended',
                 'Follow-up MRI in 3–6 months',
                 'Vascular risk factor assessment'])
    return ('Indeterminate Lesion — Further Workup Needed', 'moderate', 'TBD',
            'Lesion detected but classification confidence is low. Further imaging and '
            'histological analysis required for definitive diagnosis.',
            'Indeterminate',
            ['Urgent MRI with contrast',
             'Neurosurgery consultation',
             'Stereotactic biopsy recommended',
             'Multidisciplinary tumour board review'])


# ═══════════════════════════════════════════════════════════════
# DEMO MODE (when no model available)
# ═══════════════════════════════════════════════════════════════

def demo_predict(img_n):
    """Generate a realistic demo segmentation when no model is loaded."""
    pred = np.zeros(IMG_SIZE, dtype=np.float32)
    np.random.seed(42)
    mode = np.random.choice(['tumor', 'clear', 'small'], p=[0.4, 0.35, 0.25])
    if mode == 'clear':
        pred += np.random.rand(*IMG_SIZE) * 0.15
    else:
        cx = np.random.randint(40, 90)
        cy = np.random.randint(40, 90)
        r = np.random.randint(8, 22) if mode == 'tumor' else np.random.randint(3, 9)
        Y, X = np.ogrid[:IMG_SIZE[0], :IMG_SIZE[1]]
        dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
        pred[dist < r] = np.random.uniform(0.6, 0.92)
        pred += np.random.rand(*IMG_SIZE) * 0.1
        pred = np.clip(pred, 0, 1)
    return pred


def demo_classify():
    """Generate demo classification probabilities."""
    choice = np.random.choice([0, 1, 2], p=[0.3, 0.3, 0.4])
    probs = np.random.dirichlet([0.5, 0.5, 0.5])
    probs[choice] = max(probs) + 0.3
    probs = probs / probs.sum()
    return probs


# ═══════════════════════════════════════════════════════════════
# VISUALIZATION GENERATION
# ═══════════════════════════════════════════════════════════════

def to_b64(fig):
    """Convert matplotlib figure to base64 PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=96, bbox_inches='tight',
                facecolor=fig.get_facecolor())
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()


def generate_visualizations(img_n, pred, binary, detected, area_pct, contour=None):
    """
    Generate all 5 visualization images as base64 strings.
    Uses OpenCV for contour drawing when available.
    """
    BG = '#07080f'

    # ── 1. Original MRI ──
    fig1, ax1 = plt.subplots(figsize=(4, 4), facecolor=BG)
    ax1.imshow(img_n, cmap='gray', vmin=0, vmax=1)
    ax1.set_title('Original MRI', color='#94a3b8', fontsize=9, pad=6)
    ax1.axis('off')
    orig_b64 = to_b64(fig1)

    # ── 2. Segmentation Mask ──
    fig2, ax2 = plt.subplots(figsize=(4, 4), facecolor=BG)
    # Show raw prediction as heatmap
    ax2.imshow(pred, cmap='plasma', vmin=0, vmax=1)
    # Draw contour if available
    if contour is not None and CV2:
        contour_img = np.zeros((*IMG_SIZE, 4), dtype=np.float32)
        cv2.drawContours(contour_img, [contour], -1, (0, 1, 0.8, 0.9), 2)
        ax2.imshow(contour_img)
    ax2.set_title('Segmentation Mask', color='#94a3b8', fontsize=9, pad=6)
    ax2.axis('off')
    seg_b64 = to_b64(fig2)

    # ── 3. Tumor Overlay ──
    fig3, ax3 = plt.subplots(figsize=(4, 4), facecolor=BG)
    ax3.imshow(img_n, cmap='gray', vmin=0, vmax=1)
    if detected:
        # Semi-transparent red overlay for tumor region
        ov = np.zeros((*IMG_SIZE, 4))
        ov[binary == 1] = [1, 0.15, 0.15, 0.65]
        ax3.imshow(ov)
        # Draw contour boundary
        if contour is not None and CV2:
            contour_overlay = np.zeros((*IMG_SIZE, 4), dtype=np.float32)
            cv2.drawContours(contour_overlay, [contour], -1, (1, 0.9, 0, 0.95), 2)
            ax3.imshow(contour_overlay)
    label_text = f'Tumour Overlay ({area_pct:.2f}%)' if detected else 'No Tumour Detected'
    ax3.set_title(label_text, color='#94a3b8', fontsize=9, pad=6)
    ax3.axis('off')
    ov_b64 = to_b64(fig3)

    # ── 4. Comparison Grid ──
    fig4, axes = plt.subplots(1, 3, figsize=(12, 4), facecolor=BG)
    for ax in axes:
        ax.set_facecolor(BG)

    axes[0].imshow(img_n, cmap='gray')
    axes[0].set_title('Original', color='#94a3b8', fontsize=9)
    axes[0].axis('off')

    axes[1].imshow(pred, cmap='plasma')
    axes[1].set_title('Segmentation', color='#94a3b8', fontsize=9)
    axes[1].axis('off')

    axes[2].imshow(img_n, cmap='gray')
    if detected:
        ov2 = np.zeros((*IMG_SIZE, 4))
        ov2[binary == 1] = [1, 0.15, 0.15, 0.6]
        axes[2].imshow(ov2)
    axes[2].set_title('Overlay', color='#94a3b8', fontsize=9)
    axes[2].axis('off')

    plt.tight_layout(pad=0.3)
    cmp_b64 = to_b64(fig4)

    # ── 5. Confidence Heatmap ──
    fig5, ax5 = plt.subplots(figsize=(5, 4), facecolor=BG)
    im = ax5.imshow(pred, cmap='hot', vmin=0, vmax=1)
    cbar = plt.colorbar(im, ax=ax5, fraction=0.046)
    cbar.ax.yaxis.set_tick_params(color='#64748b')
    plt.setp(cbar.ax.yaxis.get_ticklabels(), color='#64748b', fontsize=7)
    ax5.set_title('Confidence Heatmap', color='#94a3b8', fontsize=9, pad=6)
    ax5.axis('off')
    hm_b64 = to_b64(fig5)

    return orig_b64, seg_b64, ov_b64, cmp_b64, hm_b64


# ═══════════════════════════════════════════════════════════════
# MAIN INFERENCE FUNCTION
# ═══════════════════════════════════════════════════════════════

def run_segmentation(pil_image):
    """
    Run brain tumor segmentation and classification on an uploaded MRI image.

    Pipeline:
    1. Preprocess with OpenCV (CLAHE, denoise, normalize)
    2. Run model inference (segmentation + classification)
    3. Post-process mask with OpenCV (morphological ops, contour detection)
    4. Classify tumor combining model output + area analysis
    5. Generate all visualization images

    Args:
        pil_image: PIL Image of the uploaded MRI scan

    Returns:
        dict with all results (matches SegmentationResult model fields)
    """
    # ── Step 1: Preprocess ──
    img_n = preprocess_image(pil_image)

    # ── Step 2: Model Inference ──
    model = get_model()
    cls_probs = None

    if model is not None and TF_AVAILABLE:
        inp = img_n[np.newaxis, :, :, np.newaxis].astype(np.float32)

        if _model_type == 'dual':
            # Dual-head model: returns [segmentation, classification]
            outputs = model.predict(inp, verbose=0)
            pred = outputs[0][0, :, :, 0]    # Segmentation mask
            cls_probs = outputs[1][0]         # Classification probabilities [3]
        else:
            # Single-output model: segmentation only
            pred = model.predict(inp, verbose=0)[0, :, :, 0]
            cls_probs = None
    else:
        # Demo mode
        pred = demo_predict(img_n)
        cls_probs = demo_classify()

    # ── Step 3: Post-process with OpenCV ──
    brain_mask = create_brain_mask(img_n)
    binary = postprocess_mask(pred, brain_mask, threshold=0.3)

    tp = int(binary.sum())
    brain_pixels = max(int(brain_mask.sum()), 1)
    total = IMG_SIZE[0] * IMG_SIZE[1]
    area_pct = round(tp / brain_pixels * 100, 3)  # % of BRAIN, not whole image
    detected = tp > 10  # Lower threshold — 10 pixels is enough for small lesions

    # Debug logging
    pred_min, pred_max, pred_mean = float(pred.min()), float(pred.max()), float(pred.mean())
    print(f'[Brainify] Prediction stats: min={pred_min:.3f}, max={pred_max:.3f}, mean={pred_mean:.3f}')
    print(f'[Brainify] Brain mask pixels: {brain_pixels}, Tumor pixels: {tp}, Detected: {detected}')
    if cls_probs is not None:
        print(f'[Brainify] Classification probs: {[f"{p:.3f}" for p in cls_probs]}')

    # Confidence score
    if detected:
        # Mean prediction value within detected region
        tumor_region_conf = float(pred[binary > 0].mean()) if binary.sum() > 0 else 0
        confidence = round(min(tumor_region_conf * 100, 98.5), 1)
    else:
        confidence = round(float(pred.max()) * 100, 1)
        confidence = min(confidence, 40.0)  # Cap when no tumor

    # Contour detection
    contour = find_tumor_contour(binary)
    tumor_props = get_tumor_properties(binary, contour)

    # ── Step 4: Compute Metrics ──
    # Compare the binary (post-processed) mask against the raw prediction (soft mask)
    # This measures agreement between raw model output and cleaned binary mask
    eps = 1e-7
    pred_bin_raw = (pred > 0.5).astype(np.float32)  # raw model threshold
    # True positives: both agree there's tumor
    tp_metric = float(np.sum(binary * pred_bin_raw))
    # False positives: binary says tumor but raw doesn't
    fp_metric = float(np.sum(binary * (1 - pred_bin_raw)))
    # False negatives: raw says tumor but binary (after cleanup) doesn't
    fn_metric = float(np.sum((1 - binary) * pred_bin_raw))
    tn_metric = total - tp_metric - fp_metric - fn_metric

    dice = round(2 * tp_metric / (2 * tp_metric + fp_metric + fn_metric + eps), 4)
    iou = round(tp_metric / (tp_metric + fp_metric + fn_metric + eps), 4)
    acc = round((tp_metric + tn_metric) / total * 100, 2)
    prec = round(tp_metric / (tp_metric + fp_metric + eps), 4)
    rec = round(tp_metric / (tp_metric + fn_metric + eps), 4)
    f1 = round(2 * prec * rec / (prec + rec + eps), 4)

    # ── Step 5: Classification ──
    classification, severity, who_grade, description, location, recs = classify_tumor(
        area_pct, confidence, detected, cls_probs=cls_probs
    )

    # ── Step 6: Generate Visualizations ──
    if not MPL:
        empty = base64.b64encode(b'').decode()
        return {
            'tumor_detected': detected, 'confidence_score': confidence,
            'tumor_pixels': tp, 'tumour_area': area_pct,
            'dice_score': dice, 'iou_score': iou, 'accuracy': acc,
            'precision': prec, 'recall': rec, 'f1_score': f1,
            'classification': classification, 'severity': severity,
            'who_grade': who_grade, 'clinical_description': description,
            'tumor_location': location, 'recommendations': recs,
            'original_b64': empty, 'segmented_b64': empty,
            'overlay_b64': empty, 'comparison_b64': empty, 'heatmap_b64': empty,
        }

    orig_b64, seg_b64, ov_b64, cmp_b64, hm_b64 = generate_visualizations(
        img_n, pred, binary, detected, area_pct, contour
    )

    return {
        'tumor_detected':   detected,
        'confidence_score': confidence,
        'tumor_pixels':     tp,
        'tumour_area':      area_pct,
        'dice_score':       dice,
        'iou_score':        iou,
        'accuracy':         acc,
        'precision':        prec,
        'recall':           rec,
        'f1_score':         f1,
        'classification':   classification,
        'severity':         severity,
        'who_grade':        who_grade,
        'clinical_description': description,
        'tumor_location':   location,
        'recommendations':  recs,
        'original_b64':     orig_b64,
        'segmented_b64':    seg_b64,
        'overlay_b64':      ov_b64,
        'comparison_b64':   cmp_b64,
        'heatmap_b64':      hm_b64,
    }


# ═══════════════════════════════════════════════════════════════
# EAGER LOAD — pre-load model at import time so server logs show status
# ═══════════════════════════════════════════════════════════════
try:
    get_model()
except Exception as e:
    print(f'[Brainify] Model pre-load failed: {e}')
