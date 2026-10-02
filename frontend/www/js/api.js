// ===== Связь с backend'ом =====
// Адрес сервера можно поменять прямо на экране входа. Эмулятор: 10.0.2.2, телефон: IP компьютера.
const Api = {
  base: localStorage.getItem("api_base") || "http://10.0.2.2:8000/api",
  token: localStorage.getItem("token"),

  setBase(v) { this.base = (v || this.base).trim().replace(/\/+$/, ""); localStorage.setItem("api_base", this.base); },
  setToken(t) { this.token = t; t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); },

  async req(path, { method = "GET", body } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (this.token) headers.Authorization = `Token ${this.token}`;
    let res;
    try { res = await fetch(this.base + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
    catch (_) { throw new Error("Нет связи с сервером"); }
    let data = null;
    try { data = await res.json(); } catch (_) { /* пустой ответ */ }
    if (!res.ok) {
      const d = data && (data.detail || Object.values(data).flat().join(" "));
      throw new Error(d || `Ошибка запроса (${res.status})`);
    }
    return data;
  },

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
