# Создай книгу — Android-приложение

Библиотека, где авторы пишут и публикуют книги, а читатели читают, оценивают, пишут рецензии и общаются с авторами.

```
sozdaikniga/
├── backend/     — Django + DRF API, база данных SQLite (db.sqlite3)
└── frontend/    — Capacitor-проект (то, из чего соберётся .apk)
```

## Шаг 1. Запустить backend (на компьютере)

Нужен Python 3.10+.

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python manage.py makemigrations library
python manage.py migrate
python manage.py createsuperuser   # для входа в /admin/, необязательно
python manage.py runserver 0.0.0.0:8000
```

Проверка: откройте `http://127.0.0.1:8000/admin/`. База данных `backend/db.sqlite3` создаётся командой `migrate`.

API (заголовок `Authorization: Token <token>`):
- `POST /api/auth/register/` — `{name, nickname, email, phone, password}`
- `POST /api/auth/login/` — `{username, password}` → `{token, profile}`
- `GET/PATCH /api/profile/me/` — профиль и тема оформления
- `GET/POST /api/books/` — каталог опубликованных книг / создать книгу
- `GET /api/books/mine/`, `GET/PUT/DELETE /api/books/<id>/`
- `GET/POST /api/books/<id>/reviews/` — отзывы и рецензии
- `GET /api/chat/conversations/`, `GET/POST /api/chat/<никнейм>/` — сообщения

## Шаг 2. Адрес backend'а

Адрес указывается прямо на экране входа в приложении (внизу, поле «Адрес сервера»):
- **Эмулятор Android:** `http://10.0.2.2:8000/api` (по умолчанию)
- **Телефон в той же Wi-Fi сети:** `http://IP_КОМПЬЮТЕРА:8000/api`

## Шаг 3. Собрать Android-приложение

Нужны [Node.js](https://nodejs.org/) (LTS) и [Android Studio](https://developer.android.com/studio).

```bash
cd frontend
npm install
npx cap add android
npx cap sync android
npx cap open android
```

В Android Studio дождитесь синхронизации Gradle и нажмите ▶ Run.

**Запуск на телефоне без USB-провода:** на телефоне включите «Отладка по Wi-Fi», в Android Studio откройте Device Manager → Pair devices using Wi-Fi и отсканируйте QR-код. Либо Build → Build APK(s), файл `frontend/android/app/build/outputs/apk/debug/app-debug.apk` отправьте на телефон и установите.

## Что внутри
- Вход с лампой, регистрация (имя, никнейм, email, телефон, пароль)
- Каталог: поиск, жанры, популярное, последние добавления, бестселлеры
- Страница книги, чтение, отзывы и рецензии, редактор для авторов
- Личные сообщения, три темы оформления, бот-волшебник
- Работа без сети: последние данные кэшируются, книги, сохранённые без связи, отправляются позже
