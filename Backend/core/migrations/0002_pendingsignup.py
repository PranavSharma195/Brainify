from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('core', '0001_initial')]
    operations = [
        migrations.CreateModel(
            name='PendingSignup',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True)),
                ('token', models.CharField(max_length=128, unique=True)),
                ('full_name', models.CharField(max_length=150)),
                ('email', models.EmailField(unique=True)),
                ('password_hash', models.CharField(max_length=255)),
                ('role', models.CharField(default='radiologist', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
