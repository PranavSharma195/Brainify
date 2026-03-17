import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_mriscan_deleted_at_mriscan_deleted_by_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GameScore",
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
                ("high_score", models.IntegerField(default=0)),
                ("best_level", models.IntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="game_scores",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "unique_together": {("user", "game")},
            },
        ),
    ]
