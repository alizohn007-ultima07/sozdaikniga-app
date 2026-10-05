// ===== Связь с backend'ом =====
// Адрес постоянно работающего сервера (после развёртывания на Render впишите сюда свой адрес).
// Его же можно поменять на экране входа. Для проверки на своём компьютере: http://IP_КОМПЬЮТЕРА:8000/api
const SERVER_URL = "https://sozdaikniga-backend.onrender.com";

const Api = {
  base: localStorage.getItem("api_base") || SERVER_URL,
  token: localStorage.getItem("token"),

  setBase(v) { this.base = (v || this.base).trim().replace(/\/+$/, ""); localStorage.setItem("api_base", this.base); },
  setToken(t) { this.token = t; t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); },

  async req(path, { method = "GET", body } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (this.token) headers.Authorization = `Token ${this.token}`;
    // Бесплатный хостинг «засыпает» без активности: ждём до минуты и пробуем ещё раз
    let res;
    for (let attempt = 0; attempt < 2 && !res; attempt++) {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 45000);
      try { res = await fetch(this.base + path, { method, headers, signal: ctl.signal, body: body ? JSON.stringify(body) : undefined }); }
      catch (_) { if (attempt) throw new Error("Нет связи с сервером"); }
      finally { clearTimeout(t); }
    }
    let data = null;
    try { data = await res.json(); } catch (_) { /* пустой ответ */ }
    if (!res.ok) {
      const d = data && (data.detail || Object.values(data).flat().join(" "));
      throw new Error(d || `Ошибка запроса (${res.status})`);
    }
    return data;
  },

  wake: () => fetch(Api.base + "/health/").catch(() => {}),

  register: d => Api.req("/auth/register/", { method: "POST", body: d }),
  login: (username, password) => Api.req("/auth/login/", { method: "POST", body: { username, password } }),
  me: () => Api.req("/profile/me/"),
  patchMe: p => Api.req("/profile/me/", { method: "PATCH", body: p }),

  books: () => Api.req("/books/"),
  mine: () => Api.req("/books/mine/"),
  book: id => Api.req(`/books/${id}/`),
  saveBook: b => b.id ? Api.req(`/books/${b.id}/`, { method: "PUT", body: b }) : Api.req("/books/", { method: "POST", body: b }),
  delBook: id => Api.req(`/books/${id}/`, { method: "DELETE" }),

  reviews: id => Api.req(`/books/${id}/reviews/`),
  addReview: (id, d) => Api.req(`/books/${id}/reviews/`, { method: "POST", body: d }),

  dialogs: () => Api.req("/chat/conversations/"),
  chat: nick => Api.req(`/chat/${encodeURIComponent(nick)}/`),
  send: (nick, text) => Api.req(`/chat/${encodeURIComponent(nick)}/`, { method: "POST", body: { text } }),
};
