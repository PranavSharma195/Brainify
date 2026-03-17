import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_gamescore"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GameScoreHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("game", models.CharField(
                    choices=[
                        ("memory_match",  "Memory Match"),
                        ("simon_says",    "Simon Says"),
                        ("number_memory", "Number Memory"),
                        ("grid_pattern",  "Grid Pattern"),
                        ("word_flash",    "Word Flash"),
                        ("speed_match",   "Speed Match"),
                        ("color_order",   "Color Order"),
                    ],
                    max_length=30,
                )),
                ("score",         models.IntegerField()),
                ("level_reached", models.IntegerField()),
                ("played_at",     models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="game_history",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "ordering": ["-played_at"],
            },
        ),
    ]
