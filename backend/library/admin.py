from django.contrib import admin
from .models import Profile, Book, Review, Message

admin.site.register(Profile)
admin.site.register(Book)
admin.site.register(Review)
admin.site.register(Message)
