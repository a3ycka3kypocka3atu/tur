const { test, section, summary } = require("./helpers/assert");
const { loadAppsScript, postToSheet, getFromSheet } = require("./helpers/apps-script");

function basePayload(overrides = {}) {
  return {
    source: "AC Travel Website",
    language: "ru",
    firstName: "Анна",
    lastName: "Смирнова",
    whatsapp: "+420 123 456 789",
    email: "",
    service: "care",
    departure: "2026-09-01",
    returnDate: "2026-09-14",
    travelers: "2",
    comments: "Хочу к морю ☀️",
    contactConsent: true,
    ...overrides,
  };
}

section("apps script: health and success path");
test("doGet returns structured health JSON", () => {
  const loaded = loadAppsScript();
  const health = getFromSheet(loaded);
  if (health.status !== "ok") throw new Error("expected ok status");
  if (!String(health.message).includes("AC Travel")) throw new Error("expected AC Travel message");
});
test("successful post appends header row then data row and returns success", () => {
  const loaded = loadAppsScript();
  const response = postToSheet(loaded, basePayload());

  if (response.status !== "success") throw new Error("expected success, got " + JSON.stringify(response));
  if (loaded.rows.length !== 2) throw new Error("expected 2 rows (headers + data), got " + loaded.rows.length);
  if (loaded.rows[0].length !== 14) throw new Error("expected 14 header columns, got " + loaded.rows[0].length);
  if (loaded.rows[1].length !== 14) throw new Error("expected 14 data columns, got " + loaded.rows[1].length);
  if (loaded.rows[1][12] !== "" || loaded.rows[1][13] !== "") throw new Error("legacy file columns must stay empty");
  if (!(loaded.rows[1][0] instanceof Date)) throw new Error("submitted-at must be a Date");
});
test("append happens before the success response", () => {
  const loaded = loadAppsScript();
  postToSheet(loaded, basePayload());
  if (loaded.events.length !== 2 || loaded.events[1] !== "append") throw new Error("append order wrong: " + JSON.stringify(loaded.events));
});
test("new sheet gets the header row automatically", () => {
  const loaded = loadAppsScript();
  loaded.rows.length = 0;
  postToSheet(loaded, basePayload());
  if (loaded.rows.length !== 2 || loaded.rows[0][3] !== "First Name") throw new Error("headers were not written");
});
section("apps script: validation parity with proxy");
test("missing required fields are rejected without appending", () => {
  const loaded = loadAppsScript();
  const response = postToSheet(loaded, basePayload({ firstName: "" }));
  if (response.status !== "error" || response.code !== "INVALID_REQUEST") throw new Error("expected INVALID_REQUEST");
  if (loaded.rows.length !== 0) throw new Error("no row must be appended (validation runs before sheet access)");
});
test("missing consent is rejected", () => {
  const loaded = loadAppsScript();
  const response = postToSheet(loaded, basePayload({ contactConsent: false }));
  if (response.status !== "error") throw new Error("expected error");
  if (!response.message.includes("consent")) throw new Error("expected consent message");
});
test("unsupported language is rejected", () => {
  const loaded = loadAppsScript();
  const response = postToSheet(loaded, basePayload({ language: "de" }));
  if (response.status !== "error") throw new Error("expected error");
});
test("invalid whatsapp is rejected, international formats accepted", () => {
  const loaded = loadAppsScript();
  const bad = postToSheet(loaded, basePayload({ whatsapp: "call me" }));
  if (bad.status !== "error") throw new Error("expected error for bad whatsapp");

  for (const number of ["+420 123 456 789", "0044 20 1234 5678", "(420) 123-456-789"]) {
    const ok = postToSheet(loaded, basePayload({ whatsapp: number }));
    if (ok.status !== "success") throw new Error("rejected " + number);
  }
});
test("optional email: empty ok, malformed rejected", () => {
  const loaded = loadAppsScript();
  if (postToSheet(loaded, basePayload({ email: "" })).status !== "success") throw new Error("empty email should pass");
  if (postToSheet(loaded, basePayload({ email: "nope" })).status !== "error") throw new Error("bad email should fail");
  if (postToSheet(loaded, basePayload({ email: "ok@example.com" })).status !== "success") throw new Error("good email should pass");
});
test("malformed request body returns structured error JSON", () => {
  const loaded = loadAppsScript();
  const output = loaded.api.doPost({ postData: { contents: "not json" } });
  const response = JSON.parse(output.text);
  if (response.status !== "error" || response.code !== "SERVER_ERROR") throw new Error("expected structured SERVER_ERROR");
});

section("apps script: formula safety boundary");
test("formula-like =SUM(1,1) is neutralised", () => {
  const loaded = loadAppsScript();
  postToSheet(loaded, basePayload({ firstName: "=SUM(1,1)", comments: "=HYPERLINK(\"https://evil\",\"x\")" }));
  if (loaded.rows[1][3] !== "'=SUM(1,1)") throw new Error("firstName not neutralised: " + JSON.stringify(loaded.rows[1][3]));
  if (!loaded.rows[1][11].startsWith("'=")) throw new Error("comments not neutralised");
});
test("values starting with +, -, @ stay unchanged and phone remains usable", () => {
  const loaded = loadAppsScript();
  postToSheet(loaded, basePayload({ whatsapp: "+420 123 456 789", comments: "+1+1\n-1+1\n@something" }));
  if (loaded.rows[1][5] !== "+420 123 456 789") throw new Error("phone damaged: " + JSON.stringify(loaded.rows[1][5]));
  if (!loaded.rows[1][11].startsWith("+1+1")) throw new Error("+1+1 changed unexpectedly");
  if (!loaded.rows[1][11].includes("-1+1") || !loaded.rows[1][11].includes("@something")) throw new Error("text changed unexpectedly");
});
test("normal text is unchanged", () => {
  const loaded = loadAppsScript();
  postToSheet(loaded, basePayload({ firstName: "Балканы — горы 🏔️" }));
  if (loaded.rows[1][3] !== "Балканы — горы 🏔️") throw new Error("text damaged: " + JSON.stringify(loaded.rows[1][3]));
});

section("apps script: comments flattening");
test("structured fields are flattened deterministically into Comments", () => {
  const loaded = loadAppsScript();
  postToSheet(loaded, basePayload({
    comments: "Нужен ранний заезд",
    interests: ["nature", "food"],
    destinations: "Албания",
    foodNeeds: "Вегетарианское",
    peopleToMeet: "Предприниматели",
    groupStyle: "small-group",
    budget: "open",
  }));
  const comments = loaded.rows[1][11];
  const expected = [
    "Нужен ранний заезд",
    "Interests: nature, food",
    "Destinations: Албания",
    "Food needs: Вегетарианское",
    "People to meet: Предприниматели",
    "Group style: small-group",
    "Budget: open",
  ];
  for (const line of expected) {
    if (!comments.includes(line)) throw new Error("missing line: " + line + " in\n" + comments);
  }
});
test("comments are capped at MAX_SPREADSHEET_TEXT_LENGTH", () => {
  const loaded = loadAppsScript();
  postToSheet(loaded, basePayload({ comments: "x".repeat(5000) }));
  if (loaded.rows[1][11].length !== 2000) throw new Error("comments not capped: " + loaded.rows[1][11].length);
});
