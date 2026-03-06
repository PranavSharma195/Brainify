from django.contrib import admin
from .models import UserProfile, MRIScan, SegmentationResult, Report, LoginHistory, SystemStats

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user','role','is_verified']
    list_filter  = ['role','is_verified']

@admin.register(MRIScan)
class MRIScanAdmin(admin.ModelAdmin):
    list_display  = ['patient_name','patient_id','uploaded_by','scan_type','priority','status','upload_date']
    list_filter   = ['status','scan_type','priority']
    search_fields = ['patient_name','patient_id']

@admin.register(SegmentationResult)
class SegResultAdmin(admin.ModelAdmin):
    list_display = ['scan','tumor_detected','classification','severity','confidence_score','dice_score']
    list_filter  = ['tumor_detected','severity']

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['result','user','generated_at','download_count']

@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    list_display  = ['user','login_status','login_time','ip_address']
    list_filter   = ['login_status']
    search_fields = ['user__username']

admin.site.register(SystemStats)
