from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health),
    path("auth/register/", views.register),
    path("auth/login/", views.login),
    path("profile/me/", views.me),

    path("books/", views.books),
    path("books/mine/", views.my_books),
    path("books/<int:book_id>/", views.book_detail),
    path("books/<int:book_id>/reviews/", views.reviews),

    path("chat/conversations/", views.conversations),
    path("chat/<str:username>/", views.chat),
]
