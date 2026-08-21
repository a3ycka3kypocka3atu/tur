const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { test, testAsync, section, summary } = require("./helpers/assert");

const scriptSrc = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

class FakeClassList {
  constructor() {
    this.names = new Set();
  }
  add(...names) {
    names.forEach((n) => this.names.add(n));
  }
  remove(...names) {
    names.forEach((n) => this.names.delete(n));
  }
  toggle(name, force) {
    if (force === undefined) {
      if (this.names.has(name)) {
        this.names.delete(name);
        return false;
      }
      this.names.add(name);
      return true;
    }
    if (force) this.names.add(name);
    else this.names.delete(name);
    return !!force;
  }
  contains(name) {
    return this.names.has(name);
  }
}

class FakeElement {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attributes = new Map(Object.entries(attrs));
    this.dataset = {};
    for (const [k, v] of this.attributes) {
      if (k.startsWith("data-")) {
        const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[key] = v;
      }
    }
    this.classList = new FakeClassList();
    if (attrs.class) {
      String(attrs.class).split(/\s+/).forEach((c) => c && this.classList.add(c));
    }
    this.children = [];
    this.parent = null;
    this.listeners = {};
    this.textContent = "";
    this.name = attrs.name || "";
    this.type = attrs.type || "";
    this._value = attrs.value || "";
    this._defaultValue = attrs.value || "";
    this.checked = false;
    this.disabled = false;
    this.open = false;
  }
  get value() {
    return this._value;
  }
  set value(v) {
    this._value = String(v);
  }
  get open() {
    return this.getAttribute("open") !== null;
  }
  set open(v) {
    if (v) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  setAttribute(name, v) {
    this.attributes.set(name, String(v));
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[key] = String(v);
    }
  }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      delete this.dataset[key];
    }
  }
  addEventListener(type, fn) {
    this.listeners[type] = fn;
  }
  dispatchEvent(event) {
    event.target = event.target || this;
    if (this.listeners[event.type]) {
      return this.listeners[event.type](event);
    }
    return true;
  }
  appendChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  matches(selector) {
    return matchesSelector(this, selector);
  }
  querySelector(selector) {
    return findDescendants(this, selector)[0] || null;
  }
  querySelectorAll(selector) {
    return findDescendants(this, selector);
  }
}

function matchesSelector(el, selector) {
  const chunks = selector.match(/[a-zA-Z]+|\[[^\]]+\]|\.[a-zA-Z0-9_-]+/g) || [];
  return chunks.every((chunk) => {
    if (chunk.startsWith(".")) {
      return el.classList.contains(chunk.slice(1));
    }
    if (chunk.startsWith("[")) {
      const m = chunk.match(/^\[([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]"']*)))?\]$/);
      if (!m) return false;
      if (m[2] !== undefined) return el.getAttribute(m[1]) === m[2];
      if (m[3] !== undefined) return el.getAttribute(m[1]) === m[3];
      if (m[4] !== undefined) return el.getAttribute(m[1]) === m[4];
      return el.getAttribute(m[1]) !== null;
    }
    return el.tagName === chunk.toUpperCase();
  });
}

function findDescendants(root, selector) {
  const out = [];
  const walk = (el) => {
    for (const child of el.children) {
      if (matchesSelector(child, selector)) out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

class FakeFormData {
  constructor(form) {
    this.entries = [];
    for (const el of collectFields(form)) {
      if (el.type === "checkbox") {
        if (el.checked) this.entries.push([el.name, el.value]);
      } else {
        this.entries.push([el.name, el.value]);
      }
    }
  }
  get(name) {
    const entry = this.entries.find(([k]) => k === name);
    return entry ? entry[1] : null;
  }
  getAll(name) {
    return this.entries.filter(([k]) => k === name).map(([, v]) => v);
  }
}

function collectFields(form, out = []) {
  for (const child of form.children) {
    if (child.name) out.push(child);
    collectFields(child, out);
  }
  return out;
}

class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.key = init.key;
    this.target = init.target;
    this.defaultPrevented = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
}

function resetForm(form) {
  for (const el of collectFields(form)) {
    if (el.type === "checkbox") el.checked = false;
    else el.value = el._defaultValue;
  }
}

function createFetchMock(mode) {
  const calls = [];
  const fn = (url, init) => {
    calls.push({ url, init });
    if (mode === "fail") {
      return Promise.resolve({ ok: false, status: 502 });
    }
    if (mode === "bad-json") {
      return Promise.resolve({
        ok: true,
        json: async () => {
          throw new Error("parse error");
        },
      });
    }
    if (mode === "deferred") {
      return new Promise((resolve) => {
        fn.resolve = () => resolve({ ok: true, json: async () => ({ status: "success" }) });
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({ status: "success" }) });
  };
  return { fn, calls };
}

function loadPage({ fetchMode = "success", initialLanguage = null } = {}) {
  const store = { siteLanguage: initialLanguage };
  const localStorage = {
    getItem: (k) => (k === "siteLanguage" ? store.siteLanguage : null),
    setItem: (k, v) => {
      store.siteLanguage = v;
    },
  };

  const windowObj = {
    scrollY: 0,
    listeners: {},
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
  };

  const all = [];
  const document = {
    title: "",
    documentElement: new FakeElement("html"),
    body: new FakeElement("body"),
    listeners: {},
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
    querySelector(selector) {
      return all.find((el) => matchesSelector(el, selector)) || null;
    },
    querySelectorAll(selector) {
      return all.filter((el) => matchesSelector(el, selector));
    },
  };

  const mk = (tag, attrs = {}) => {
    const el = new FakeElement(tag, attrs);
    all.push(el);
    return el;
  };

  const labelText = (text) => {
    const span = mk("span");
    span.textContent = text;
    return span;
  };

  // meta tags
  mk("meta", { name: "description", content: "ru description" });
  mk("meta", { property: "og:title", content: "ru og title" });
  mk("meta", { property: "og:description", content: "ru og description" });

  // header / nav
  const header = mk("header", { "data-header": "1" });
  document.body.appendChild(header);
  const navToggle = mk("button", { "data-nav-toggle": "1", "aria-label": "Открыть меню" });
  header.appendChild(navToggle);
  const nav = mk("nav", { "data-nav": "1" });
  header.appendChild(nav);
  const navLink = mk("a", { href: "#profile" });
  nav.appendChild(navLink);

  // language switch
  const ruButton = mk("button", { "data-lang-switch": "ru", "aria-pressed": "false" });
  const enButton = mk("button", { "data-lang-switch": "en", "aria-pressed": "false" });
  document.body.appendChild(ruButton);
  document.body.appendChild(enButton);

  // journey filters
  const filterButtons = {};
  for (const name of ["all", "nature", "retreat", "community", "remote"]) {
    const button = mk("button", { "data-offer-filter": name });
    document.body.appendChild(button);
    filterButtons[name] = button;
  }

  // offer cards
  const cardNature = mk("article", { "data-offer-category": "nature" });
  const cardRetreat = mk("article", { "data-offer-category": "retreat community" });
  const cardRemote = mk("article", { "data-offer-category": "remote" });
  document.body.appendChild(cardNature);
  document.body.appendChild(cardRetreat);
  document.body.appendChild(cardRemote);

  // FAQ list
  const faqList = mk("div", { class: "faq-list" });
  document.body.appendChild(faqList);
  const faqOne = mk("details");
  const faqTwo = mk("details");
  faqList.appendChild(faqOne);
  faqList.appendChild(faqTwo);

  // prefill links
  const prefillNature = mk("a", { "data-prefill-interest": "nature", href: "#profile" });
  const prefillCare = mk("a", { "data-prefill-interest": "care", href: "#profile" });
  const prefillBogus = mk("a", { "data-prefill-interest": "bogus", href: "#profile" });
  const prefillRole = mk("a", { "data-prefill-role": "host", href: "#profile" });
  document.body.appendChild(prefillNature);
  document.body.appendChild(prefillCare);
  document.body.appendChild(prefillBogus);
  document.body.appendChild(prefillRole);

  // year
  const year = mk("span", { "data-current-year": "1" });
  document.body.appendChild(year);

  // form
  const form = mk("form", { "data-request-form": "1" });
  form.reset = () => resetForm(form);
  document.body.appendChild(form);

  const field = (tag, name, attrs = {}, labelKey = null, labelTextRu = null) => {
    const el = mk(tag, { name, ...attrs });
    form.appendChild(el);
    if (labelKey) {
      const label = mk("span", { "data-i18n": labelKey });
      label.textContent = labelTextRu;
      form.appendChild(label);
    }
    return el;
  };

  const roleSelect = mk("select", { name: "service", "data-role-select": "1" });
  roleSelect._defaultValue = "traveler";
  roleSelect.value = "traveler";
  form.appendChild(roleSelect);

  const firstName = field("input", "firstName", { type: "text" }, "firstName", "Имя");
  const lastName = field("input", "lastName", { type: "text" }, "lastName", "Фамилия");
  const whatsapp = field("input", "whatsapp", { type: "tel" }, "whatsappLabel", "WhatsApp / телефон");
  const email = field("input", "email", { type: "email" });
  const destinations = field("input", "destinations", { type: "text" });
  const departure = field("input", "departure", { type: "date" });
  const returnDate = field("input", "returnDate", { type: "date" });
  const travelers = field("input", "travelers", { type: "number", value: "1" });
  travelers._defaultValue = "1";
  travelers.value = "1";

  const budgetSelect = mk("select", { name: "budget" });
  budgetSelect._defaultValue = "open";
  budgetSelect.value = "open";
  form.appendChild(budgetSelect);

  const groupSelect = mk("select", { name: "groupStyle" });
  groupSelect._defaultValue = "small-group";
  groupSelect.value = "small-group";
  form.appendChild(groupSelect);

  const activitySelect = mk("select", { name: "activity" });
  activitySelect._defaultValue = "balanced";
  activitySelect.value = "balanced";
  form.appendChild(activitySelect);

  const wifiSelect = mk("select", { name: "wifi" });
  wifiSelect._defaultValue = "not-important";
  wifiSelect.value = "not-important";
  form.appendChild(wifiSelect);

  const interestBoxes = {};
  for (const value of ["nature", "retreat", "food", "community", "stays", "remote", "active", "care"]) {
    const box = mk("input", { type: "checkbox", name: "interests", value });
    box.value = value;
    form.appendChild(box);
    interestBoxes[value] = box;
  }

  const stayBoxes = {};
  for (const value of ["retreat-center", "ecovillage", "house", "guesthouse"]) {
    const box = mk("input", { type: "checkbox", name: "stayTypes", value });
    box.value = value;
    form.appendChild(box);
    stayBoxes[value] = box;
  }

  const foodNeeds = field("input", "foodNeeds", { type: "text" });
  const peopleToMeet = field("textarea", "peopleToMeet", {});
  const comments = field("textarea", "comments", {});

  const consentBox = mk("input", { type: "checkbox", name: "contactConsent", value: "on" });
  consentBox.value = "on";
  form.appendChild(consentBox);

  const consentText = mk("span", { "data-i18n": "consentText" });
  consentText.textContent = "Согласен на обработку данных из этой заявки для ответа и подбора подходящих предложений.";
  form.appendChild(consentText);

  const submitButton = mk("button", { type: "submit", "data-submit-button": "1", "data-i18n": "submitButton" });
  submitButton.textContent = "Создать мой travel profile";
  form.appendChild(submitButton);

  const formStatus = mk("p", { "data-form-status": "1" });
  form.appendChild(formStatus);

  const privacyNote = mk("p", { "data-i18n": "privacyNote" });
  privacyNote.textContent = "Заявка сохраняется в нашей таблице запросов и используется только для связи с вами по ней. Медицинские документы мы не собираем.";
  form.appendChild(privacyNote);

  const fetchMock = createFetchMock(fetchMode);

  const context = {
    document,
    window: windowObj,
    localStorage,
    FormData: FakeFormData,
    Event: FakeEvent,
    fetch: fetchMock.fn,
    console,
    Set,
    Map,
    Array,
    String,
    Number,
    Boolean,
    Object,
    Date,
    JSON,
    Promise,
    Error,
    RegExp,
    Math,
    parseFloat,
    parseInt,
    isNaN,
    setTimeout,
    clearTimeout,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(scriptSrc, context);

  return {
    context,
    document,
    window: windowObj,
    localStorage: store,
    els: {
      header, navToggle, nav, navLink, ruButton, enButton, filterButtons,
      cardNature, cardRetreat, cardRemote, faqList, faqOne, faqTwo,
      prefillNature, prefillCare, prefillBogus, prefillRole, year,
      form, roleSelect, firstName, lastName, whatsapp, email, destinations,
      departure, returnDate, travelers, budgetSelect, groupSelect,
      activitySelect, wifiSelect, interestBoxes, stayBoxes, foodNeeds,
      peopleToMeet, comments, consentBox, submitButton, formStatus,
    },
    fetchMock,
  };
}

section("frontend runtime: i18n");
test("RU is the default language and meta tags are set", () => {
  const page = loadPage();
  if (page.document.documentElement.lang !== "ru") throw new Error("default language is not ru");
  if (page.document.title !== "AC Travel | Авторские путешествия и сообщество") throw new Error("ru title not set: " + page.document.title);
  if (page.els.ruButton.getAttribute("aria-pressed") !== "true") throw new Error("ru button not active");
  const firstNameLabel = page.document.querySelectorAll('[data-i18n="firstName"]')[0];
  if (firstNameLabel.textContent !== "Имя") throw new Error("ru label wrong: " + firstNameLabel.textContent);
  if (page.localStorage.siteLanguage !== "ru") throw new Error("ru not persisted");
});
test("switching to EN translates, updates meta and persists; switching back restores RU", () => {
  const page = loadPage();
  page.els.enButton.dispatchEvent(new FakeEvent("click"));

  if (page.document.documentElement.lang !== "en") throw new Error("lang not en");
  if (!page.document.title.startsWith("AC Travel | Curated Journeys")) throw new Error("en title not set");
  if (page.els.enButton.getAttribute("aria-pressed") !== "true") throw new Error("en button not active");
  if (page.els.ruButton.getAttribute("aria-pressed") !== "false") throw new Error("ru button still active");
  const firstNameLabel = page.document.querySelectorAll('[data-i18n="firstName"]')[0];
  if (firstNameLabel.textContent !== "First name") throw new Error("en label wrong: " + firstNameLabel.textContent);
  if (page.localStorage.siteLanguage !== "en") throw new Error("en not persisted");

  page.els.ruButton.dispatchEvent(new FakeEvent("click"));
  if (page.document.documentElement.lang !== "ru") throw new Error("lang not restored");
  const restored = page.document.querySelectorAll('[data-i18n="firstName"]')[0];
  if (restored.textContent !== "Имя") throw new Error("ru label not restored: " + restored.textContent);
});
test("saved EN preference is applied on load", () => {
  const page = loadPage({ initialLanguage: "en" });
  if (page.document.documentElement.lang !== "en") throw new Error("persisted language ignored");
});
section("frontend runtime: menu and header");
test("mobile menu toggles open/closed with aria state and closes on link click", () => {
  const page = loadPage();
  page.els.navToggle.dispatchEvent(new FakeEvent("click"));
  if (!page.els.nav.classList.contains("is-open")) throw new Error("nav not opened");
  if (!page.document.body.classList.contains("nav-open")) throw new Error("body nav-open missing");
  if (page.els.navToggle.getAttribute("aria-expanded") !== "true") throw new Error("aria-expanded wrong");
  if (page.els.navToggle.getAttribute("aria-label") !== "Закрыть меню") throw new Error("ru close label wrong");

  // click bubbles from the link to the nav listener
  page.els.nav.dispatchEvent(new FakeEvent("click", { target: page.els.navLink }));
  if (page.els.nav.classList.contains("is-open")) throw new Error("nav not closed after link click");
  if (page.els.navToggle.getAttribute("aria-expanded") !== "false") throw new Error("aria-expanded not reset");
});
test("Escape closes the menu", () => {
  const page = loadPage();
  page.els.navToggle.dispatchEvent(new FakeEvent("click"));
  page.document.listeners.keydown(new FakeEvent("keydown", { key: "Escape" }));
  if (page.els.nav.classList.contains("is-open")) throw new Error("nav still open after Escape");
});
test("header scroll state follows window.scrollY", () => {
  const page = loadPage();
  page.window.scrollY = 100;
  page.window.listeners.scroll();
  if (!page.els.header.classList.contains("is-scrolled")) throw new Error("header not scrolled");
  page.window.scrollY = 0;
  page.window.listeners.scroll();
  if (page.els.header.classList.contains("is-scrolled")) throw new Error("header still scrolled");
});

section("frontend runtime: FAQ, filters, prefills");
test("FAQ single-open behaviour", () => {
  const page = loadPage();
  page.els.faqOne.open = true;
  page.els.faqTwo.open = true;
  page.els.faqList.dispatchEvent(new FakeEvent("toggle", { target: page.els.faqOne }));
  if (!page.els.faqOne.open) throw new Error("opened FAQ should stay open");
  if (page.els.faqTwo.open) throw new Error("second FAQ should have been closed");
});
test("journey filters show only matching cards and mark the active button", () => {
  const page = loadPage();
  page.els.filterButtons.retreat.dispatchEvent(new FakeEvent("click"));
  if (!page.els.filterButtons.retreat.classList.contains("is-active")) throw new Error("active class missing");
  if (page.els.filterButtons.all.classList.contains("is-active")) throw new Error("all still active");
  if (!page.els.cardRetreat.classList.contains("is-hidden") === false) throw new Error("retreat card should be visible");
  if (!page.els.cardNature.classList.contains("is-hidden")) throw new Error("nature card should be hidden");
  if (!page.els.cardRemote.classList.contains("is-hidden")) throw new Error("remote card should be hidden");

  page.els.filterButtons.all.dispatchEvent(new FakeEvent("click"));
  if (page.els.cardNature.classList.contains("is-hidden")) throw new Error("all filter should reveal nature card");
  if (page.els.cardRetreat.classList.contains("is-hidden")) throw new Error("all filter should reveal retreat card");
});
test("CTA interest prefill checks the canonical checkbox; unknown keys are ignored", () => {
  const page = loadPage();
  page.els.prefillNature.dispatchEvent(new FakeEvent("click"));
  if (!page.els.interestBoxes.nature.checked) throw new Error("nature checkbox not checked");
  page.els.prefillCare.dispatchEvent(new FakeEvent("click"));
  if (!page.els.interestBoxes.care.checked) throw new Error("care checkbox not checked");
  page.els.prefillBogus.dispatchEvent(new FakeEvent("click"));
  if (page.els.interestBoxes.retreat.checked) throw new Error("bogus prefill must not check anything");
});
test("role prefill sets the role select", () => {
  const page = loadPage();
  page.els.prefillRole.dispatchEvent(new FakeEvent("click"));
  if (page.els.roleSelect.value !== "host") throw new Error("role not prefilled: " + page.els.roleSelect.value);
});
test("Health & Care interest and role are both selectable", () => {
  const page = loadPage();
  page.els.interestBoxes.care.checked = true;
  if (!page.els.interestBoxes.care.checked) throw new Error("care interest not selectable");
  page.els.roleSelect.value = "care";
  if (page.els.roleSelect.value !== "care") throw new Error("care role not selectable");
});
test("current year is rendered", () => {
  const page = loadPage();
  if (page.els.year.textContent !== String(new Date().getFullYear())) throw new Error("year wrong: " + page.els.year.textContent);
});

section("frontend runtime: submit flow");
function fillValidForm(page) {
  page.els.firstName.value = "Анна";
  page.els.lastName.value = "Смирнова";
  page.els.whatsapp.value = "+420 123 456 789";
  page.els.destinations.value = "Албания";
  page.els.travelers.value = "2";
  page.els.interestBoxes.nature.checked = true;
  page.els.interestBoxes.care.checked = true;
  page.els.stayBoxes["retreat-center"].checked = true;
  page.els.activitySelect.value = "active";
  page.els.comments.value = "Хочу к морю ☀️";
  page.els.consentBox.checked = true;
}

testAsync("submit disables the button while pending, posts to /api/submit, resets on confirmed success", async () => {
  const page = loadPage({ fetchMode: "deferred" });
  fillValidForm(page);

  const event = new FakeEvent("submit");
  const pending = page.els.form.dispatchEvent(event);

  if (!event.defaultPrevented) throw new Error("native submit not prevented");
  if (!page.els.submitButton.disabled) throw new Error("button not disabled while pending");
  if (page.els.formStatus.textContent !== "Отправляем вашу заявку...") throw new Error("sending status wrong: " + page.els.formStatus.textContent);

  page.fetchMock.fn.resolve();
  await pending;

  if (page.els.formStatus.textContent !== "Спасибо. Заявка отправлена — мы свяжемся с вами, когда появится подходящий формат.") {
    throw new Error("success status wrong: " + page.els.formStatus.textContent);
  }
  if (!page.els.formStatus.classList.contains("is-success")) throw new Error("is-success class missing");
  if (page.els.submitButton.disabled) throw new Error("button not re-enabled");
  if (page.els.firstName.value !== "") throw new Error("form was not reset");
  if (page.els.interestBoxes.nature.checked) throw new Error("interests not reset");
  if (page.els.consentBox.checked) throw new Error("consent not reset");
  if (page.els.activitySelect.value !== "balanced") throw new Error("select not reset to default");

  const call = page.fetchMock.calls[0];
  if (call.url !== "/api/submit") throw new Error("wrong endpoint: " + call.url);
  if (call.init.method !== "POST") throw new Error("wrong method");
  if (call.init.headers["Content-Type"] !== "application/json") throw new Error("wrong content type");
  const body = JSON.parse(call.init.body);
  if (body.firstName !== "Анна") throw new Error("payload firstName wrong");
  if (body.language !== "ru") throw new Error("payload language wrong");
  if (body.contactConsent !== true) throw new Error("payload consent wrong");
  if (!body.comments.includes("Interests: nature, care")) throw new Error("interests missing from comments");
  if (!body.comments.includes("Хочу к морю ☀️")) throw new Error("notes missing from comments");
});
testAsync("failure keeps form values, shows localized error and re-enables the button", async () => {
  const page = loadPage({ fetchMode: "fail" });
  fillValidForm(page);
  await page.els.form.dispatchEvent(new FakeEvent("submit"));

  if (page.els.formStatus.textContent !== "Не удалось отправить заявку. Данные формы сохранены — проверьте соединение и попробуйте ещё раз.") {
    throw new Error("error status wrong: " + page.els.formStatus.textContent);
  }
  if (!page.els.formStatus.classList.contains("is-error")) throw new Error("is-error class missing");
  if (page.els.submitButton.disabled) throw new Error("button not re-enabled after failure");
  if (page.els.firstName.value !== "Анна") throw new Error("values must be retained after failure");
  if (!page.els.interestBoxes.nature.checked) throw new Error("checked values must be retained");
  if (page.fetchMock.calls.length !== 1) throw new Error("exactly one fetch expected");
});
testAsync("unparseable success response is treated as failure", async () => {
  const page = loadPage({ fetchMode: "bad-json" });
  fillValidForm(page);
  await page.els.form.dispatchEvent(new FakeEvent("submit"));
  if (!page.els.formStatus.classList.contains("is-error")) throw new Error("expected error state");
  if (page.els.submitButton.disabled) throw new Error("button not re-enabled");
});
testAsync("EN failure shows the English error message", async () => {
  const page = loadPage({ fetchMode: "fail", initialLanguage: "en" });
  fillValidForm(page);
  await page.els.form.dispatchEvent(new FakeEvent("submit"));
  if (page.els.formStatus.textContent !== "We could not send your request. Your form entries are kept—check your connection and try again.") {
    throw new Error("en error status wrong: " + page.els.formStatus.textContent);
  }
});
testAsync("duplicate submit is prevented while a request is pending", async () => {
  const page = loadPage({ fetchMode: "deferred" });
  fillValidForm(page);
  const first = page.els.form.dispatchEvent(new FakeEvent("submit"));
  if (!page.els.submitButton.disabled) throw new Error("button must be disabled during flight");
  page.fetchMock.fn.resolve();
  await first;
  if (page.fetchMock.calls.length !== 1) throw new Error("unexpected extra fetch");
});
