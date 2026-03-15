from django.db import models
from django.contrib.auth.models import User
import uuid

class UserProfile(models.Model):
    ROLES = [('radiologist','Radiologist'),('neurologist','Neurologist'),
             ('technician','Technician'),('admin','Admin'),('researcher','Researcher')]
    user         = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role         = models.CharField(max_length=20, choices=ROLES, default='radiologist')
    is_verified  = models.BooleanField(default=False)
    email_token  = models.CharField(max_length=64, blank=True)
    google_id    = models.CharField(max_length=128, blank=True)
    avatar_b64   = models.TextField(blank=True)
    news_notifications = models.BooleanField(default=True)
    def __str__(self): return f"{self.user.username} ({self.role})"

class LoginHistory(models.Model):
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_history')
    login_time   = models.DateTimeField(auto_now_add=True)
    login_status = models.CharField(max_length=10, choices=[('success','Success'),('failed','Failed')], default='success')
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    user_agent   = models.TextField(blank=True)
    class Meta:
        ordering = ['-login_time']
        verbose_name_plural = 'Login Histories'

class MRIScan(models.Model):
    STATUSES   = [('pending','Pending'),('processing','Processing'),('completed','Completed'),('failed','Failed')]
    SCAN_TYPES = [('T1','T1-Weighted'),('T2','T2-Weighted'),('FLAIR','FLAIR'),('DWI','DWI'),('OTHER','Other')]
    PRIORITIES = [('normal','Normal'),('high','High'),('urgent','Urgent')]

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uploaded_by      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scans')
    patient_name     = models.CharField(max_length=100, default='Unknown')
    patient_id       = models.CharField(max_length=50, default='P-00000')
    patient_age      = models.IntegerField(null=True, blank=True)
    patient_gender   = models.CharField(max_length=10, blank=True)
    scan_type        = models.CharField(max_length=10, choices=SCAN_TYPES, default='T1')
    priority         = models.CharField(max_length=10, choices=PRIORITIES, default='normal')
    scan_file        = models.FileField(upload_to='uploads/%Y/%m/')
    original_filename= models.CharField(max_length=255)
    file_size_mb     = models.FloatField(default=0)
    status           = models.CharField(max_length=20, choices=STATUSES, default='pending')
    notes            = models.TextField(blank=True)
    upload_date      = models.DateTimeField(auto_now_add=True)
    processed_at     = models.DateTimeField(null=True, blank=True)
    is_deleted       = models.BooleanField(default=False)
    deleted_at       = models.DateTimeField(null=True, blank=True)
    deleted_by       = models.ForeignKey(User, null=True, blank=True, related_name='deleted_scans', on_delete=models.SET_NULL)

    class Meta:
        ordering = ['-upload_date']

    def __str__(self):
        return f"{self.patient_name} ({self.patient_id})"

class SegmentationResult(models.Model):
    SEVERITIES = [('normal','Normal'),('mild','Mild'),('moderate','Moderate'),('severe','Severe'),('critical','Critical')]
    scan             = models.OneToOneField(MRIScan, on_delete=models.CASCADE, related_name='result')
    tumor_detected   = models.BooleanField(default=False)
    tumour_area      = models.FloatField(default=0)
    tumor_pixel_count= models.IntegerField(default=0)
    confidence_score = models.FloatField(default=0)
    classification   = models.CharField(max_length=200, blank=True)
    severity         = models.CharField(max_length=20, choices=SEVERITIES, default='normal')
    who_grade        = models.CharField(max_length=100, blank=True)
    clinical_description = models.TextField(blank=True)
    tumor_location   = models.CharField(max_length=100, blank=True)
    recommendations_json = models.TextField(blank=True)  # JSON list of recommendation strings
    dice_score       = models.FloatField(default=0)
    iou_score        = models.FloatField(default=0)
    accuracy         = models.FloatField(default=0)
    precision        = models.FloatField(default=0)
    recall           = models.FloatField(default=0)
    f1_score         = models.FloatField(default=0)
    original_b64     = models.TextField(blank=True)
    segmented_b64    = models.TextField(blank=True)
    overlay_b64      = models.TextField(blank=True)
    comparison_b64   = models.TextField(blank=True)
    heatmap_b64      = models.TextField(blank=True)
    radiologist_notes= models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Result: {self.scan.patient_name}"

class Report(models.Model):
    result         = models.OneToOneField(SegmentationResult, on_delete=models.CASCADE, related_name='report')
    user           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    generated_at   = models.DateTimeField(auto_now_add=True)
    download_count = models.IntegerField(default=0)
    def __str__(self): return f"Report: {self.result.scan.patient_name}"

class SystemStats(models.Model):
    date          = models.DateField(unique=True)
    total_users   = models.IntegerField(default=0)
    total_scans   = models.IntegerField(default=0)
    total_reports = models.IntegerField(default=0)
    tumors_found  = models.IntegerField(default=0)
    avg_dice      = models.FloatField(default=0)
    avg_iou       = models.FloatField(default=0)
    class Meta:
        ordering = ['-date']
        verbose_name_plural = 'System Stats'

class PendingSignup(models.Model):
    """Temporary signup — user is created only after email is verified."""
    token        = models.CharField(max_length=128, unique=True)
    full_name    = models.CharField(max_length=150)
    email        = models.EmailField(unique=True)
    password_hash= models.CharField(max_length=255)
    role         = models.CharField(max_length=20, default='radiologist')
    created_at   = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() > self.created_at + timedelta(hours=24)

    def __str__(self): return f"Pending: {self.email}"
