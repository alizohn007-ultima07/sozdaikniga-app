from rest_framework import serializers
from .models import Profile, Book, Review


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = Profile
        fields = ["username", "name", "email", "phone", "bio", "theme"]


class BookSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author.username", read_only=True)
    rating = serializers.FloatField(read_only=True, default=0)
    reviews_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Book
        fields = ["id", "author", "title", "genre", "description", "content", "published",
                  "rating", "reviews_count", "updated_at"]
        read_only_fields = ["updated_at"]


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "rating", "title", "text", "created_at"]
