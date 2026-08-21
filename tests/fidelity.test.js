const fs = require("fs");
const path = require("path");
const { test, testAsync, section, summary } = require("./helpers/assert");
const { submit } = require("./helpers/proxy");
const { loadAppsScript, postToSheet } = require("./helpers/apps-script");

const scriptSrc = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

const start = scriptSrc.indexOf("function getValues");
const end = scriptSrc.indexOf("window.addEventListener", start);
if (start === -1 || end === -1) {
  throw new Error("could not locate payload functions in script.js");
}

// Evaluate the real frontend payload functions from script.js verbatim.
const factory = new Function(
  "currentLanguage",
  scriptSrc.slice(start, end) + "\nreturn { getValues, buildProfileNotes, buildRequestPayload };"
);

function buildFormData(fields) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      value.forEach((item) => data.append(name, item));
    } else if (value !== undefined && value !== null && value !== "") {
      data.append(name, String(value));
    }
  }
  return data;
}

function completeRuForm() {
  return {
    interests: ["nature", "food", "care"],
    destinations: "Албания, горы",
    budget: "open",
    groupStyle: "small-group",
    stayTypes: ["retreat-center", "house"],
    activity: "active",
    wifi: "required",
    foodNeeds: "Вегетарианское",
    peopleToMeet: "Предприниматели",
    comments: "Хотим посмотреть побережье ☀️",
    service: "care",
    firstName: "Анна",
    lastName: "Смирнова",
    whatsapp: "+420 123 456 789",
    email: "",
    departure: "2026-09-01",
    returnDate: "2026-09-14",
    travelers: "2",
    contactConsent: "on",
  };
}

function enForm() {
  return {
    interests: ["nature", "stays"],
    destinations: "Balkans",
    budget: "700-1200",
    groupStyle: "either",
    stayTypes: ["ecovillage"],
    activity: "balanced",
    wifi: "useful",
    foodNeeds: "No restrictions",
    peopleToMeet: "Founders and hikers",
    comments: "O'Brien — hoping for a calm pace 🏔️",
    service: "traveler",
    firstName: "James O'Brien",
    lastName: "Murphy",
    whatsapp: "0044 20 1234 5678",
    email: "james@example.com",
    departure: "2026-10-03",
    returnDate: "",
    travelers: "1",
    contactConsent: "on",
  };
}

async function runFullPipeline(formFields, language) {
  const api = factory(language);
  const payload = api.buildRequestPayload(buildFormData(formFields));

  const { res, forwarded } = await submit(payload);
  if (res.statusCode !== 200) {
    throw new Error("proxy rejected payload: " + JSON.stringify(res.body));
  }

  const loaded = loadAppsScript();
  const response = postToSheet(loaded, forwarded);
  if (response.status !== "success") {
    throw new Error("apps script rejected payload: " + JSON.stringify(response));
  }

  return { payload, forwarded, row: loaded.rows[1], headers: loaded.rows[0] };
}

section("field fidelity: frontend payload shape");
test("buildRequestPayload emits every current form key with consent and language", () => {
  const api = factory("ru");
  const payload = api.buildRequestPayload(buildFormData(completeRuForm()));
  const keys = [
    "submittedAt", "source", "language", "firstName", "lastName", "whatsapp",
    "email", "service", "departure", "returnDate", "travelers", "comments", "contactConsent",
  ];
  for (const key of keys) {
    if (!(key in payload)) throw new Error("missing payload key: " + key);
  }
  if (payload.language !== "ru") throw new Error("language not propagated");
  if (payload.contactConsent !== true) throw new Error("consent not boolean true");
  if (payload.source !== "AC Travel Website") throw new Error("unexpected source");
  if (typeof payload.submittedAt !== "string" || !payload.submittedAt.includes("T")) throw new Error("submittedAt malformed");
});
test("frontend flattening represents every profile field deterministically", () => {
  const api = factory("ru");
  const payload = api.buildRequestPayload(buildFormData(completeRuForm()));
  const comments = payload.comments;
  const expectedLines = [
    "Interests: nature, food, care",
    "Destinations: Албания, горы",
    "Budget: open",
    "Group style: small-group",
    "Stay types: retreat-center, house",
    "Activity: active",
    "Wi-Fi: required",
    "Food needs: Вегетарианское",
    "People to meet: Предприниматели",
    "Notes: Хотим посмотреть побережье ☀️",
  ];
  for (const line of expectedLines) {
    if (!comments.includes(line)) throw new Error("missing line: " + line + " in\n" + comments);
  }
});
test("arrays survive (checked interests/stayTypes), empty optional values do not break", () => {
  const api = factory("ru");
  const minimal = api.buildRequestPayload(buildFormData({ firstName: "A", lastName: "B", whatsapp: "+420111222", contactConsent: "on" }));
  if (typeof minimal.comments !== "string" || !minimal.comments.includes("Interests: —")) throw new Error("empty interests must flatten as —");
  if (minimal.email !== "") throw new Error("empty email must stay empty string");
  if (minimal.departure !== "" || minimal.returnDate !== "") throw new Error("empty dates must stay empty");
});
test("RU and EN values with unicode and special characters survive", () => {
  for (const [form, lang] of [[completeRuForm(), "ru"], [enForm(), "en"]]) {
    const api = factory(lang);
    const payload = api.buildRequestPayload(buildFormData(form));
    if (payload.language !== lang) throw new Error("wrong language");
    if (lang === "en" && payload.comments.indexOf("O'Brien") === -1) throw new Error("apostrophe damaged");
    if (lang === "ru" && payload.comments.indexOf("☀️") === -1) throw new Error("unicode damaged");
  }
});
section("field fidelity: full pipeline frontend -> proxy -> sheet");
testAsync("complete RU profile lands in the correct 14 sheet columns", async () => {
  const { payload, forwarded, row, headers } = await runFullPipeline(completeRuForm(), "ru");

  if (headers.join("|") !== "Submitted At|Source|Language|First Name|Last Name|WhatsApp|Email|Service|Departure Date|Return Date|Number of Travelers|Comments|Dental Scan File Name|Panoramic X-ray File Name") {
    throw new Error("sheet headers changed: " + headers.join("|"));
  }

  const checks = {
    1: "AC Travel Website", // Source
    2: "ru",                // Language
    3: "Анна",              // First Name
    4: "Смирнова",          // Last Name
    5: "+420 123 456 789",  // WhatsApp
    6: "",                  // Email (optional, empty)
    7: "care",              // Service
    8: "2026-09-01",        // Departure Date
    9: "2026-09-14",        // Return Date
    10: "2",                // Number of Travelers
    12: "",                 // legacy dental scan column
    13: "",                 // legacy x-ray column
  };
  for (const [index, expected] of Object.entries(checks)) {
    if (row[Number(index)] !== expected) {
      throw new Error("column " + index + " expected " + JSON.stringify(expected) + " got " + JSON.stringify(row[Number(index)]));
    }
  }

  for (const line of [
    "Interests: nature, food, care",
    "Destinations: Албания, горы",
    "Budget: open",
    "Group style: small-group",
    "Stay types: retreat-center, house",
    "Activity: active",
    "Wi-Fi: required",
    "Food needs: Вегетарианское",
    "People to meet: Предприниматели",
    "Notes: Хотим посмотреть побережье ☀️",
  ]) {
    if (!row[11].includes(line)) throw new Error("Comments missing: " + line);
  }

  if (forwarded.language !== payload.language) throw new Error("language changed in proxy");
  if (forwarded.whatsapp !== "+420 123 456 789") throw new Error("whatsapp changed in proxy");
});
testAsync("complete EN profile lands correctly with optional email and empty return date", async () => {
  const { row } = await runFullPipeline(enForm(), "en");
  if (row[2] !== "en") throw new Error("language column wrong");
  if (row[6] !== "james@example.com") throw new Error("email column wrong");
  if (row[9] !== "") throw new Error("empty return date must stay empty");
  if (!row[11].includes("O'Brien")) throw new Error("apostrophe lost");
  if (!row[11].includes("🏔️")) throw new Error("emoji lost");
});
testAsync("malicious formula-like values are neutralised before Sheet insertion", async () => {
  const form = completeRuForm();
  form.firstName = "=1+1";
  form.comments = "=SUM(1,1)";
  form.peopleToMeet = "+1+1";
  const { row } = await runFullPipeline(form, "ru");

  // leading "=" in the First Name column is neutralised with a text marker
  if (row[3] !== "'=1+1") throw new Error("firstName formula not neutralised: " + JSON.stringify(row[3]));

  // inside Comments the flattened lines never start with "=", so the cell
  // is not executable and the notes text stays intact
  if (row[11].startsWith("=")) throw new Error("Comments cell starts with =");
  if (!row[11].includes("Notes: =SUM(1,1)")) throw new Error("notes lost: " + JSON.stringify(row[11]));
  if (!row[11].includes("+1+1")) throw new Error("+1+1 text lost");
});
testAsync("legitimate + international phone reaches the sheet unchanged", async () => {
  const { row } = await runFullPipeline(completeRuForm(), "ru");
  if (row[5] !== "+420 123 456 789") throw new Error("phone damaged in sheet: " + JSON.stringify(row[5]));
});
testAsync("minimal payload passes the whole pipeline without breakage", async () => {
  const { res, forwarded } = await submit(factory("ru").buildRequestPayload(
    buildFormData({ firstName: "A", lastName: "B", whatsapp: "+420111222", contactConsent: "on" })
  ));
  if (res.statusCode !== 200) throw new Error("minimal payload rejected by proxy");
  const loaded = loadAppsScript();
  const response = postToSheet(loaded, forwarded);
  if (response.status !== "success") throw new Error("minimal payload rejected by sheet");
  if (!loaded.rows[1][11].includes("Interests: —")) throw new Error("empty interests representation lost");
});
