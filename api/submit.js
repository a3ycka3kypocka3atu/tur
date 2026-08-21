const UPSTREAM_ENDPOINT =
  process.env.APPS_SCRIPT_ENDPOINT ||
  "https://script.google.com/macros/s/AKfycbxQvGsKN-oN-eOWzXxBIZU9_NtM06ETSu9kPjP04bTzkGnlZmofHJOYKW7cXr7YKR0RXw/exec";
const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_PAYLOAD_BYTES = 32 * 1024;
const MAX_FIELD_LENGTH = 2000;
const MAX_ARRAY_ITEMS = 64;

const REQUIRED_FIELDS = ["firstName", "lastName", "whatsapp"];
const ALLOWED_FIELDS = [
  "submittedAt",
  "source",
  "language",
  "firstName",
  "lastName",
  "whatsapp",
  "email",
  "service",
  "departure",
  "returnDate",
  "travelers",
  "destinations",
  "budget",
  "groupStyle",
  "stayTypes",
  "activity",
  "wifi",
  "foodNeeds",
  "peopleToMeet",
  "interests",
  "comments",
  "contactConsent",
];

function asTrimmedString(value, maxLength) {
  if (typeof value !== "string") {
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value).slice(0, maxLength);
    }

    if (Array.isArray(value)) {
      const items = value
        .map((item) => (typeof item === "string" || typeof item === "number" ? String(item).trim() : ""))
        .filter(Boolean)
        .slice(0, MAX_ARRAY_ITEMS);

      return items.join(", ").slice(0, maxLength);
    }

    return "";
  }

  return value.trim().slice(0, maxLength);
}

function validatePayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { code: "INVALID_REQUEST", message: "Request body must be a JSON object" };
  }

  for (const field of REQUIRED_FIELDS) {
    if (typeof raw[field] !== "string" || raw[field].trim() === "") {
      return { code: "INVALID_REQUEST", message: "Missing required field: " + field };
    }
  }

  if (raw.contactConsent !== true) {
    return { code: "CONSENT_MISSING", message: "Contact consent is required" };
  }

  if (typeof raw.language !== "string" || !["ru", "en"].includes(raw.language)) {
    return { code: "INVALID_REQUEST", message: "Unsupported language" };
  }

  if (!isAllowedContact(raw.whatsapp)) {
    return { code: "INVALID_REQUEST", message: "Invalid WhatsApp number" };
  }

  if (typeof raw.email === "string" && raw.email.trim().length > 0 && !isEmail(raw.email)) {
    return { code: "INVALID_REQUEST", message: "Invalid email address" };
  }

  for (const field of ALLOWED_FIELDS) {
    if (field === "contactConsent") {
      continue;
    }

    if (!(field in raw)) {
      continue;
    }

    const value = raw[field];
    if (Array.isArray(value) && value.length > MAX_ARRAY_ITEMS) {
      return { code: "INVALID_REQUEST", message: "Too many values: " + field };
    }

    if (typeof value === "string" && value.length > MAX_FIELD_LENGTH) {
      return { code: "INVALID_REQUEST", message: "Value too long: " + field };
    }
  }

  return null;
}

function isAllowedContact(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 50) {
    return false;
  }

  if (!/^[0-9+\-()\s]+$/.test(trimmed)) {
    return false;
  }

  const digitCount = (trimmed.match(/[0-9]/g) || []).length;
  return digitCount >= 6 && digitCount <= 20;
}

function isEmail(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  return trimmed.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function buildPayload(raw) {
  const payload = {
    submittedAt: asTrimmedString(raw.submittedAt, 40) || new Date().toISOString(),
    source: asTrimmedString(raw.source, 80) || "AC Travel Website",
    language: raw.language,
  };

  for (const field of ALLOWED_FIELDS) {
    if (field === "submittedAt" || field === "source" || field === "language") {
      continue;
    }

    if (field === "contactConsent") {
      payload[field] = true;
      continue;
    }

    payload[field] = asTrimmedString(raw[field], MAX_FIELD_LENGTH);
  }

  return payload;
}

function getBody(req) {
  if (typeof req.body === "string") {
    return req.body;
  }

  if (req.body instanceof ArrayBuffer) {
    return Buffer.from(req.body).toString("utf8");
  }

  if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(req.body)) {
    return req.body.toString("utf8");
  }

  if (req.body && typeof req.body === "object") {
    try {
      return JSON.stringify(req.body);
    } catch (error) {
      return "";
    }
  }

  return "";
}

async function forwardToBackend(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(UPSTREAM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { status: "error", code: "UPSTREAM_HTTP_ERROR" };
    }

    let result = null;
    try {
      const responseText = await response.text();
      if (!responseText) {
        return { status: "error", code: "UPSTREAM_INVALID_RESPONSE" };
      }

      result = JSON.parse(responseText);
    } catch (error) {
      return { status: "error", code: "UPSTREAM_INVALID_RESPONSE" };
    }

    if (result && result.status === "success") {
      return { status: "success" };
    }

    return {
      status: "error",
      code: "UPSTREAM_ERROR",
      message: result && result.message ? result.message : "Backend rejected the request",
    };
  } catch (error) {
    const code = error && error.name === "AbortError" ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNREACHABLE";
    return { status: "error", code };
  } finally {
    clearTimeout(timer);
  }
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ status: "error", code: "METHOD_NOT_ALLOWED" });
    return;
  }

  let body;
  try {
    body = getBody(req);
  } catch (error) {
    res.status(400).json({ status: "error", code: "INVALID_BODY_ENCODING" });
    return;
  }

  if (Buffer.byteLength(body, "utf8") > MAX_PAYLOAD_BYTES) {
    res.status(413).json({ status: "error", code: "PAYLOAD_TOO_LARGE" });
    return;
  }

  let raw;
  try {
    raw = JSON.parse(body);
  } catch (error) {
    res.status(400).json({ status: "error", code: "INVALID_JSON" });
    return;
  }

  const validationError = validatePayload(raw);
  if (validationError) {
    res.status(400).json({ status: "error", ...validationError });
    return;
  }

  const result = await forwardToBackend(buildPayload(raw));

  if (result.status === "success") {
    res.status(200).json({ status: "success" });
    return;
  }

  res.status(502).json(result);
}

module.exports = handler;
