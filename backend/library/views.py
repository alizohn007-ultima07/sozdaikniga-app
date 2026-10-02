from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Book, Message, Profile, Review
from .serializers import BookSerializer, ProfileSerializer, ReviewSerializer


def err(text, code=400):
    return Response({"detail": text}, status=code)


def auth_payload(user):
    token, _ = Token.objects.get_or_create(user=user)
    return {"token": token.key, "profile": ProfileSerializer(user.profile).data}


# ---------- Аккаунт ----------
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    d = request.data
    name, nick = (d.get("name") or "").strip(), (d.get("nickname") or "").strip()
    email, password = (d.get("email") or "").strip(), d.get("password") or ""
    if not name or len(nick) < 3:
        return err("Укажите имя и никнейм от 3 символов")
    if "@" not in email:
        return err("Некорректный email")
    if len(password) < 6:
        return err("Пароль от 6 символов")
    if User.objects.filter(username__iexact=nick).exists() or User.objects.filter(email__iexact=email).exists():
        return err("Никнейм или email уже заняты", 409)
    user = User.objects.create_user(username=nick, email=email, password=password)
    Profile.objects.create(user=user, name=name, phone=(d.get("phone") or "").strip())
    return Response(auth_payload(user), status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    user = authenticate(username=request.data.get("username"), password=request.data.get("password"))
    if not user:
        return err("Неверный никнейм или пароль", 401)
    Profile.objects.get_or_create(user=user, defaults={"name": user.username})
    return Response(auth_payload(user))


@api_view(["GET", "PATCH"])
def me(request):
    profile = request.user.profile
    if request.method == "PATCH":
        s = ProfileSerializer(profile, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
    return Response(ProfileSerializer(profile).data)


# ---------- Книги ----------
def books_qs():
    return Book.objects.select_related("author").annotate(rating=Avg("reviews__rating"), reviews_count=Count("reviews"))


@api_view(["GET", "POST"])
def books(request):
    if request.method == "POST":
        s = BookSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        b = s.save(author=request.user)
        return Response(BookSerializer(books_qs().get(pk=b.pk)).data, status=201)
    qs = books_qs().filter(published=True)
    q, g = request.query_params.get("q", ""), request.query_params.get("genre", "")
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(author__username__icontains=q))
    if g:
        qs = qs.filter(genre=g)
    return Response(BookSerializer(qs, many=True).data)


@api_view(["GET"])
def my_books(request):
    return Response(BookSerializer(books_qs().filter(author=request.user), many=True).data)


@api_view(["GET", "PUT", "DELETE"])
def book_detail(request, book_id):
    book = get_object_or_404(books_qs(), pk=book_id)
    mine = book.author_id == request.user.id
    if not mine and (request.method != "GET" or not book.published):
        return err("Книга недоступна", 404 if request.method == "GET" else 403)
    if request.method == "DELETE":
        book.delete()
        return Response(status=204)
    if request.method == "PUT":
        s = BookSerializer(book, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        book = books_qs().get(pk=book_id)
    return Response(BookSerializer(book).data)


# ---------- Отзывы и рецензии ----------
@api_view(["GET", "POST"])
def reviews(request, book_id):
    book = get_object_or_404(Book, pk=book_id)
    if request.method == "POST":
        try:
            rating = int(request.data.get("rating"))
        except (TypeError, ValueError):
            rating = 0
        if not 1 <= rating <= 5:
            return err("Оценка от 1 до 5")
        Review.objects.update_or_create(book=book, user=request.user, defaults={
            "rating": rating, "title": (request.data.get("title") or "")[:120], "text": request.data.get("text") or ""})
    return Response(ReviewSerializer(book.reviews.select_related("user"), many=True).data)


# ---------- Сообщения ----------
@api_view(["GET"])
def conversations(request):
    me_ = request.user
    seen = {}
    for m in Message.objects.filter(Q(sender=me_) | Q(receiver=me_)).select_related("sender", "receiver").order_by("-id"):
        other = m.receiver if m.sender_id == me_.id else m.sender
        seen.setdefault(other.username, {"username": other.username, "text": m.text, "created_at": m.created_at})
    return Response(list(seen.values()))


@api_view(["GET", "POST"])
def chat(request, username):
    other = get_object_or_404(User, username=username)
    me_ = request.user
    if request.method == "POST":
        text = (request.data.get("text") or "").strip()[:2000]
        if not text:
            return err("Пустое сообщение")
        Message.objects.create(sender=me_, receiver=other, text=text)
    msgs = Message.objects.filter(Q(sender=me_, receiver=other) | Q(sender=other, receiver=me_)).order_by("id")
    return Response([{"mine": m.sender_id == me_.id, "text": m.text, "created_at": m.created_at} for m in msgs])
