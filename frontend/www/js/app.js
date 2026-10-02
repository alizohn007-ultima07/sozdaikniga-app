// ===== Приложение «Создай книгу» =====
const GENRES = ["Фантастика", "Фэнтези", "Детектив", "Роман", "Приключения", "Поэзия", "Другое"];
const THEMES = { light: "Светлая", dark: "Тёмная", library: "Библиотека" };
const TIPS = ["Не знаете, что почитать? Загляните в «Бестселлеры».",
  "Автор, напишите сегодня хотя бы страницу. Начало всегда самое трудное.",
  "Оставьте отзыв: автору важно знать, что вы дочитали.",
  "Идея для сюжета: герой находит письмо, которое адресовано не ему.",
  "Каждая большая книга начиналась с одной строчки."];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hue = t => [...(t || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const cover = (b, cls = "") => `<div class="cover ${cls}" style="background:hsl(${hue(b.title)},40%,38%)">${esc(b.title || "Без названия")}</div>`;
const stars = b => b.reviews_count ? `★ ${Number(b.rating).toFixed(1)} (${b.reviews_count})` : "Пока без оценок";

let me = null, tab = "books", timer = null, all = [], mine = [], filter = { q: "", g: "" };

// Загрузка с запасным вариантом: при отсутствии сети берём последние сохранённые данные
async function load(key, fn) {
  try { const d = await fn(); localStorage.setItem(key, JSON.stringify(d)); return d; }
  catch (e) { const c = localStorage.getItem(key); if (c) return JSON.parse(c); throw e; }
}
// Книги, сохранённые без сети, уходят на сервер позже
async function flushOutbox() {
  const box = JSON.parse(localStorage.getItem("outbox") || "[]"), left = [];
  for (const b of box) { try { await Api.saveBook(b); } catch (_) { left.push(b); } }
  localStorage.setItem("outbox", JSON.stringify(left));
}

function applyTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem("theme", t); }
function setScreen(html) { $("#screen").innerHTML = html; window.scrollTo(0, 0); }
function fail(e) { setScreen(`<p class="error">${esc(e.message)}</p><button class="wide" onclick="go(tab)">Повторить</button>`); }

// ---------- Вход и регистрация ----------
$("#to-reg").onclick = () => { $("#f-login").classList.add("hidden"); $("#f-reg").classList.remove("hidden"); };
$("#to-login").onclick = () => { $("#f-reg").classList.add("hidden"); $("#f-login").classList.remove("hidden"); };
async function authDone(r) { Api.setToken(r.token); me = r.profile; localStorage.setItem("me", JSON.stringify(me)); enter(); }
$("#f-login").onsubmit = async e => {
  e.preventDefault(); Api.setBase($("#srv").value);
  try { await authDone(await Api.login($("#l-user").value.trim(), $("#l-pass").value)); } catch (x) { $("#l-err").textContent = x.message; }
};
$("#f-reg").onsubmit = async e => {
  e.preventDefault(); Api.setBase($("#srv").value);
  try {
    await authDone(await Api.register({ name: $("#r-name").value.trim(), nickname: $("#r-nick").value.trim(),
      email: $("#r-email").value.trim(), phone: $("#r-phone").value.trim(), password: $("#r-pass").value }));
  } catch (x) { $("#r-err").textContent = x.message; }
};

function enter() {
  ["#auth"].forEach(s => $(s).classList.add("hidden"));
  ["#app", "#nav", "#bot"].forEach(s => $(s).classList.remove("hidden"));
  applyTheme(me.theme || "light"); flushOutbox(); go("books");
}
function logout() { Api.setToken(null); localStorage.clear(); location.reload(); }

// ---------- Навигация ----------
function go(t) {
  clearInterval(timer); tab = t;
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  ({ books: showBooks, dialogs: showDialogs, profile: showProfile })[t]();
}
document.querySelectorAll("nav button").forEach(b => b.onclick = () => go(b.dataset.tab));
$("#screen").addEventListener("click", e => {
  const o = e.target.closest("[data-open]"); if (o) openBook(o.dataset.open);
  const c = e.target.closest("[data-chat]"); if (c) openChat(c.dataset.chat);
});

// ---------- Книги ----------
const bookCard = b => `<div class="card row" data-open="${b.id}">${cover(b, "sm")}<div>
  <b style="font-family:Georgia,serif">${esc(b.title || "Без названия")}</b>
  <div class="sub">${esc(b.author)} · ${esc(b.genre)}</div><div class="acc sub">${stars(b)}</div>
  <div class="sub">${esc((b.description || "").slice(0, 90))}</div></div></div>`;

async function showBooks() {
  setScreen(`<h1>Создай книгу</h1><input id="q" placeholder="Поиск по названию или автору" value="${esc(filter.q)}">
    <div class="chips" id="chips"></div><div id="res" class="sub">Загрузка…</div>`);
  try { all = await load("books", Api.books); } catch (e) { return fail(e); }
  $("#q").oninput = e => { filter.q = e.target.value; drawBooks(); };
  drawBooks();
}
function drawBooks() {
  $("#chips").innerHTML = ["", ...GENRES].map(g => `<button class="chip ${filter.g === g ? "on" : ""}" data-g="${g}">${g || "Все"}</button>`).join("");
  $("#chips").onclick = e => { const g = e.target.dataset.g; if (g !== undefined) { filter.g = g; drawBooks(); } };
  const q = filter.q.toLowerCase();
  const list = all.filter(b => (!filter.g || b.genre === filter.g) && (!q || (b.title + " " + b.author).toLowerCase().includes(q)));
  const home = !q && !filter.g, byRate = [...all].sort((a, b) => (b.rating * 10 + b.reviews_count) - (a.rating * 10 + a.reviews_count));
  $("#res").className = "";
  $("#res").innerHTML = !all.length ? `<p class="sub">Пока нет опубликованных книг. Напишите первую во вкладке «Профиль».</p>`
    : home ? `<h2>Популярное</h2><div class="carousel">${byRate.slice(0, 10).map(b => `<div data-open="${b.id}">${cover(b)}</div>`).join("")}</div>
      <h2>Последние добавления</h2>${all.slice(0, 5).map(bookCard).join("")}
      <h2>Бестселлеры</h2>${[...all].sort((a, b) => b.reviews_count - a.reviews_count).slice(0, 3).map(bookCard).join("")}
      <h2>Читательские правила</h2><div class="card">Уважайте автора. Критикуйте текст, а не человека. Не публикуйте чужие книги без разрешения.</div>`
    : `<h2>Найдено: ${list.length}</h2>${list.map(bookCard).join("")}`;
}

async function openBook(id) {
  clearInterval(timer);
  let b, revs;
  try { [b, revs] = await Promise.all([Api.book(id), Api.reviews(id)]); } catch (e) { return fail(e); }
  const own = b.author === me.username;
  setScreen(`<button onclick="go(tab)">← Назад</button>
    <div class="row" style="margin-top:12px;cursor:default">${cover(b)}<div><h1>${esc(b.title)}</h1>
    <div class="sub">${esc(b.author)} · ${esc(b.genre)}</div><div class="acc">${stars(b)}</div></div></div>
    <p>${esc(b.description)}</p>
    <button class="primary" id="read">Читать</button>
    ${own ? "" : `<button data-chat="${esc(b.author)}">Написать автору</button>`}
    <div id="txt" class="card text hidden">${esc(b.content || "Текст пока пуст.")}</div>
    <h2>Отзывы и рецензии</h2>
    ${revs.map(r => `<div class="card"><span class="acc">${esc(r.user)} ${"★".repeat(r.rating)}</span>
      ${r.title ? `<div><b>Рецензия: ${esc(r.title)}</b></div>` : ""}<div>${esc(r.text)}</div></div>`).join("") || `<p class="sub">Отзывов пока нет.</p>`}
    <h2>Ваш отзыв</h2>
    <select id="rate">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${"★".repeat(n)}</option>`).join("")}</select>
    <input id="rt" placeholder="Заголовок рецензии (необязательно)"><textarea id="rx" placeholder="Ваш отзыв"></textarea>
    <p class="error" id="re"></p><button class="primary wide" id="rsend">Отправить отзыв</button>`);
  $("#read").onclick = () => $("#txt").classList.toggle("hidden");
  $("#rsend").onclick = async () => {
    try { await Api.addReview(id, { rating: +$("#rate").value, title: $("#rt").value, text: $("#rx").value }); openBook(id); }
    catch (e) { $("#re").textContent = e.message; }
  };
}

// ---------- Редактор книги ----------
function openEditor(b = { title: "", genre: "Другое", description: "", content: "", published: false }) {
  setScreen(`<button onclick="go('profile')">← Назад</button><h2>${b.id ? "Редактирование" : "Новая книга"}</h2>
    <input id="e-t" placeholder="Название книги" value="${esc(b.title)}">
    <select id="e-g">${GENRES.map(g => `<option ${g === b.genre ? "selected" : ""}>${g}</option>`).join("")}</select>
    <input id="e-d" placeholder="Описание" value="${esc(b.description)}">
    <textarea id="e-c" style="min-height:260px" placeholder="Текст книги">${esc(b.content)}</textarea>
    <label><input type="checkbox" id="e-p" style="width:auto" ${b.published ? "checked" : ""}> Опубликовать для всех</label>
    <p class="error" id="e-err"></p><button class="primary wide" id="e-save">Сохранить</button>
    ${b.id ? `<button class="wide" id="e-del" style="color:#B3261E">Удалить книгу</button>` : ""}`);
  $("#e-save").onclick = async () => {
    const nb = { ...b, title: $("#e-t").value.trim(), genre: $("#e-g").value, description: $("#e-d").value, content: $("#e-c").value, published: $("#e-p").checked };
    if (!nb.title) return $("#e-err").textContent = "Введите название";
    try { await Api.saveBook(nb); go("profile"); }
    catch (e) {
      if (e.message !== "Нет связи с сервером") return $("#e-err").textContent = e.message;
      const box = JSON.parse(localStorage.getItem("outbox") || "[]"); box.push(nb); localStorage.setItem("outbox", JSON.stringify(box));
      $("#e-err").textContent = "Нет связи: книга сохранена на телефоне и отправится позже.";
    }
  };
  if (b.id) $("#e-del").onclick = async () => { if (confirm("Удалить книгу?")) { try { await Api.delBook(b.id); go("profile"); } catch (e) { $("#e-err").textContent = e.message; } } };
}

// ---------- Сообщения ----------
async function showDialogs() {
  setScreen(`<h1>Сообщения</h1><div class="bar"><input id="nn" placeholder="Никнейм собеседника"><button class="primary" id="nb">Написать</button></div><div id="dl" class="sub">Загрузка…</div>`);
  $("#nb").onclick = () => { const n = $("#nn").value.trim(); if (n) openChat(n); };
  try {
    const d = await load("dialogs", Api.dialogs);
    $("#dl").className = "";
    $("#dl").innerHTML = d.map(x => `<div class="card" data-chat="${esc(x.username)}"><b>${esc(x.username)}</b><div class="sub">${esc(x.text)}</div></div>`).join("")
      || `<p class="sub">Диалогов пока нет. Напишите автору со страницы книги.</p>`;
  } catch (e) { $("#dl").textContent = e.message; }
}
async function openChat(nick) {
  clearInterval(timer);
  setScreen(`<button onclick="go('dialogs')">← Назад</button><h2>${esc(nick)}</h2><div class="msgs" id="ms"></div>
    <p class="error" id="ce"></p><div class="bar"><input id="mt" placeholder="Сообщение"><button class="primary" id="ms-send">➤</button></div>`);
  const draw = list => { const ms = $("#ms"); if (!ms) return;
    ms.innerHTML = list.map(m => `<div class="msg ${m.mine ? "mine" : ""}">${esc(m.text)}</div>`).join(""); };
  const poll = async () => { try { draw(await Api.chat(nick)); $("#ce").textContent = ""; } catch (e) { if ($("#ce")) $("#ce").textContent = e.message; } };
  await poll(); timer = setInterval(poll, 3000);
  $("#ms-send").onclick = async () => { const t = $("#mt").value.trim(); if (!t) return; $("#mt").value = "";
    try { draw(await Api.send(nick, t)); } catch (e) { $("#ce").textContent = e.message; } };
}

// ---------- Профиль и настройки ----------
async function showProfile() {
  setScreen(`<h1>${esc(me.name)}</h1><div class="sub">@${esc(me.username)}</div>
    <h2>Тема оформления</h2><div class="chips">${Object.entries(THEMES).map(([k, v]) =>
      `<button class="chip ${document.documentElement.dataset.theme === k ? "on" : ""}" data-theme-set="${k}">${v}</button>`).join("")}</div>
    <div style="display:flex;align-items:center;justify-content:space-between"><h2>Мои книги</h2><button class="primary" id="newb">+ Новая книга</button></div>
    <div id="mb" class="sub">Загрузка…</div><button class="wide" id="out" style="margin-top:20px">Выйти из аккаунта</button>`);
  $("#newb").onclick = () => openEditor(); $("#out").onclick = logout;
  document.querySelectorAll("[data-theme-set]").forEach(b => b.onclick = async () => {
    applyTheme(b.dataset.themeSet); me.theme = b.dataset.themeSet; showProfile();
    try { await Api.patchMe({ theme: me.theme }); } catch (_) {}
  });
  try {
    mine = await load("mine", Api.mine); $("#mb").className = "";
    $("#mb").innerHTML = mine.map(b => `<div class="card row" data-edit="${b.id}">${cover(b, "sm")}<div><b>${esc(b.title)}</b>
      <div class="sub">${b.published ? "Опубликована" : "Черновик"} · ${stars(b)}</div></div></div>`).join("") || `<p class="sub">Вы ещё ничего не написали.</p>`;
    $("#mb").onclick = e => { const c = e.target.closest("[data-edit]"); if (c) openEditor(mine.find(x => x.id == c.dataset.edit)); };
  } catch (e) { $("#mb").textContent = e.message; }
}

// ---------- Бот-помощник ----------
let tip = 0;
$("#bot-bubble").textContent = TIPS[0];
$("#bot-img").onclick = () => { tip = (tip + 1) % TIPS.length; $("#bot-bubble").textContent = TIPS[tip]; };

// ---------- Старт ----------
(async function start() {
  $("#srv").value = Api.base; applyTheme(localStorage.getItem("theme") || "light");
  if (!Api.token) return;
  try { me = await load("me", Api.me); enter(); } catch (_) { Api.setToken(null); }
})();
