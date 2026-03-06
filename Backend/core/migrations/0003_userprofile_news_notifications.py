from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('core', '0002_pendingsignup')]
    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='news_notifications',
            field=models.BooleanField(default=True),
        ),
    ]
