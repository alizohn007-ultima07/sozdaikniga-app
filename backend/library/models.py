from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

GENRES = ["Фантастика", "Фэнтези", "Детектив", "Роман", "Приключения", "Поэзия", "Другое"]


class Profile(models.Model):
    """Профиль пользователя. Пользователь становится автором, когда публикует книгу."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    name = models.CharField("Имя", max_length=60)
    phone = models.CharField("Телефон", max_length=30, blank=True)
    bio = models.CharField("О себе", max_length=280, blank=True)
    theme = models.CharField("Тема оформления", max_length=10, default="light")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or self.user.username


class Book(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="books")
    title = models.CharField("Название", max_length=200)
    genre = models.CharField("Жанр", max_length=30, default="Другое")
    description = models.CharField("Описание", max_length=500, blank=True)
    content = models.TextField("Текст книги", blank=True)
    published = models.BooleanField("Опубликована", default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class Review(models.Model):
    """Отзыв (оценка + комментарий). Если заполнен заголовок, это рецензия."""
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField("Заголовок рецензии", max_length=120, blank=True)
    text = models.TextField("Текст", blank=True)
    created_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("book", "user")
        ordering = ["-created_at"]


class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent")
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received")
    text = models.CharField(max_length=2000)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
