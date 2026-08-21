const { test, testAsync, section, summary } = require("./helpers/assert");
const { submit } = require("./helpers/proxy");

function basePayload(overrides = {}) {
  return {
    submittedAt: "2026-08-20T12:00:00.000Z",
    source: "AC Travel Website",
    language: "ru",
    firstName: "Анна",
    lastName: "Смирнова",
    whatsapp: "+420 123 456 789",
    email: "",
    service: "traveler",
    departure: "",
    returnDate: "",
    travelers: "1",
    comments: "Привет ☀️",
    contactConsent: true,
    ...overrides,
  };
}

section("proxy: routing and transport");
testAsync("GET is rejected with 405 and Allow header", async () => {
  const { res } = await submit(null, { method: "GET", rawBody: "" });
  if (res.statusCode !== 405) throw new Error("expected 405, got " + res.statusCode);
  if (res.headers.Allow !== "POST") throw new Error("missing Allow header");
  if (res.body.code !== "METHOD_NOT_ALLOWED") throw new Error("wrong code");
});
testAsync("malformed JSON fails safely with 400", async () => {
  const { res } = await submit(null, { rawBody: "not json {" });
  if (res.statusCode !== 400 || res.body.code !== "INVALID_JSON") throw new Error("expected INVALID_JSON");
});
testAsync("oversized body is rejected with 413", async () => {
  const { res } = await submit(null, { rawBody: JSON.stringify({ comments: "x".repeat(40 * 1024) }) });
  if (res.statusCode !== 413 || res.body.code !== "PAYLOAD_TOO_LARGE") throw new Error("expected PAYLOAD_TOO_LARGE");
});
testAsync("non-object JSON payloads are rejected", async () => {
  for (const raw of ["[]", '"text"', "null", "42"]) {
    const { res } = await submit(null, { rawBody: raw });
    if (res.statusCode !== 400 || res.body.code !== "INVALID_REQUEST") throw new Error("expected INVALID_REQUEST for " + raw);
  }
});
testAsync("valid payload returns 200 success", async () => {
  const { res } = await submit(basePayload());
  if (res.statusCode !== 200 || res.body.status !== "success") throw new Error("expected success");
});
section("proxy: required fields, consent, language");
testAsync("missing required field is rejected", async () => {
  const { res } = await submit(basePayload({ firstName: "" }));
  if (res.statusCode !== 400 || res.body.code !== "INVALID_REQUEST") throw new Error("expected INVALID_REQUEST");
});
testAsync("consent must be exactly true", async () => {
  for (const value of [false, "true", 1, undefined]) {
    const { res } = await submit(basePayload({ contactConsent: value }));
    if (res.statusCode !== 400 || res.body.code !== "CONSENT_MISSING") throw new Error("expected CONSENT_MISSING for " + String(value));
  }
});
testAsync("language must be ru or en", async () => {
  const { res } = await submit(basePayload({ language: "de" }));
  if (res.statusCode !== 400 || res.body.code !== "INVALID_REQUEST") throw new Error("expected INVALID_REQUEST");
});

section("proxy: international contact validation");
testAsync("ordinary international formats are accepted", async () => {
  const numbers = ["+420 123 456 789", "+48 453 313 148", "0044 20 1234 5678", "(420) 123-456-789", "+420123456789", "7 999 123 45 67"];
  for (const number of numbers) {
    const { res } = await submit(basePayload({ whatsapp: number }));
    if (res.statusCode !== 200) throw new Error("rejected legitimate number: " + number);
  }
});
testAsync("clearly invalid values are rejected", async () => {
  const bad = ["call me", "12345", "abc@def", "+420 123 456 789 x100", "+--() ", "999999999999999999999", "hello world 123456", ""];
  for (const number of bad) {
    const { res } = await submit(basePayload({ whatsapp: number }));
    if (res.statusCode !== 400) throw new Error("accepted invalid number: " + JSON.stringify(number));
  }
});
testAsync("whatsapp is forwarded trimmed and unchanged", async () => {
  const { res, forwarded } = await submit(basePayload({ whatsapp: "  +48 453 313 148  " }));
  if (res.statusCode !== 200) throw new Error("expected success");
  if (forwarded.whatsapp !== "+48 453 313 148") throw new Error("phone was not trimmed: " + JSON.stringify(forwarded.whatsapp));
});

section("proxy: pragmatic email validation");
testAsync("valid emails accepted, absent/empty email fine", async () => {
  for (const email of ["test@example.com", "user@sub.domain.co", "тест@пример.рф"]) {
    const { res } = await submit(basePayload({ email }));
    if (res.statusCode !== 200) throw new Error("rejected email: " + email);
  }

  const missing = await submit(basePayload({ email: undefined }));
  if (missing.res.statusCode !== 200) throw new Error("undefined email should be fine");
});
testAsync("clearly malformed emails are rejected", async () => {
  for (const email of ["not-an-email", "a@b", "a b@example.com", "@example.com", "x@.com"]) {
    const { res } = await submit(basePayload({ email }));
    if (res.statusCode !== 400) throw new Error("accepted bad email: " + email);
  }
});
testAsync("email longer than 254 chars is rejected", async () => {
  const email = "a".repeat(250) + "@example.com";
  const { res } = await submit(basePayload({ email }));
  if (res.statusCode !== 400) throw new Error("expected rejection for oversized email");
});

section("proxy: field limits and normalisation");
testAsync("strings over MAX_FIELD_LENGTH are rejected", async () => {
  const { res } = await submit(basePayload({ comments: "x".repeat(2001) }));
  if (res.statusCode !== 400 || res.body.code !== "INVALID_REQUEST") throw new Error("expected INVALID_REQUEST");
});
testAsync("arrays over MAX_ARRAY_ITEMS are rejected", async () => {
  const interests = Array.from({ length: 65 }, (_, i) => "i" + i);
  const { res } = await submit(basePayload({ interests }));
  if (res.statusCode !== 400 || res.body.code !== "INVALID_REQUEST") throw new Error("expected INVALID_REQUEST");
});
testAsync("unexpected fields do not reach the backend", async () => {
  const { res, forwarded } = await submit(basePayload({ hacker: "x", __proto__polluted: "y", interests: ["nature"] }));
  if (res.statusCode !== 200) throw new Error("expected success");
  if ("hacker" in forwarded || "__proto__polluted" in forwarded) throw new Error("unexpected field leaked: " + JSON.stringify(forwarded));
  if (forwarded.interests !== "nature") throw new Error("allowed array not normalised");
});
testAsync("consent is normalised to true and unicode survives", async () => {
  const { forwarded } = await submit(basePayload({ comments: "Балканы — горы 🏔️", firstName: "Jörg" }));
  if (forwarded.contactConsent !== true) throw new Error("consent not normalised");
  if (forwarded.comments !== "Балканы — горы 🏔️") throw new Error("unicode damaged: " + JSON.stringify(forwarded.comments));
  if (forwarded.firstName !== "Jörg") throw new Error("unicode damaged in firstName");
});
testAsync("numeric travelers value is coerced to string", async () => {
  const { forwarded } = await submit(basePayload({ travelers: 2 }));
  if (forwarded.travelers !== "2") throw new Error("travelers not coerced: " + JSON.stringify(forwarded.travelers));
});

section("proxy: upstream failure modes");
testAsync("upstream HTTP error returns 502", async () => {
  const { res } = await submit(basePayload(), { mode: "http-error" });
  if (res.statusCode !== 502 || res.body.code !== "UPSTREAM_HTTP_ERROR") throw new Error("expected UPSTREAM_HTTP_ERROR");
});
testAsync("invalid upstream response returns 502", async () => {
  const { res } = await submit(basePayload(), { mode: "invalid-response" });
  if (res.statusCode !== 502 || res.body.code !== "UPSTREAM_INVALID_RESPONSE") throw new Error("expected UPSTREAM_INVALID_RESPONSE");
});
testAsync("backend rejection message passes through without internals", async () => {
  const { res } = await submit(basePayload(), { mode: "backend-error" });
  if (res.statusCode !== 502 || res.body.code !== "UPSTREAM_ERROR") throw new Error("expected UPSTREAM_ERROR");
  if (res.body.message !== "Backend rejected the request") throw new Error("message not passed through");
});
testAsync("unreachable upstream returns 502", async () => {
  const { res } = await submit(basePayload(), { mode: "unreachable" });
  if (res.statusCode !== 502 || res.body.code !== "UPSTREAM_UNREACHABLE") throw new Error("expected UPSTREAM_UNREACHABLE");
});
