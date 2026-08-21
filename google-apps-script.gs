const SPREADSHEET_ID = "1mRxLlivYxn9Rn9jG4QFJUyJKzIHK5CrFRB961ukwFgw";
const SHEET_NAME = "Requests";

const REQUIRED_FIELDS = ["firstName", "lastName", "whatsapp"];

// Column layout is kept unchanged for compatibility with the existing
// `Requests` sheet and its Make.com mapping. The last two columns
// ("Dental Scan File Name", "Panoramic X-ray File Name") are legacy:
// file upload was removed in T3.1 and they are always written empty.
const HEADERS = [
  "Submitted At",
  "Source",
  "Language",
  "First Name",
  "Last Name",
  "WhatsApp",
  "Email",
  "Service",
  "Departure Date",
  "Return Date",
  "Number of Travelers",
  "Comments",
  "Dental Scan File Name",
  "Panoramic X-ray File Name"
];
const MAX_SPREADSHEET_TEXT_LENGTH = 2000;

function doGet() {
  return jsonResponse({
    status: "ok",
    message: "AC Travel form endpoint is live"
  });
}

function doPost(event) {
  try {
    const payload = parsePayload(event);
    const validationError = validatePayload(payload);
    if (validationError) {
      return jsonResponse({
        status: "error",
        code: "INVALID_REQUEST",
        message: validationError
      });
    }

    const sheet = getRequestsSheet();
    sheet.appendRow(buildRow(payload));

    return jsonResponse({ status: "success" });
  } catch (error) {
    return jsonResponse({
      status: "error",
      code: "SERVER_ERROR",
      message: error.message
    });
  }
}

function parsePayload(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw new Error("Request body is missing");
  }

  const payload = JSON.parse(event.postData.contents);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Request body must be a JSON object");
  }

  return payload;
}

function validatePayload(payload) {
  const missing = REQUIRED_FIELDS.filter(function (field) {
    return typeof payload[field] !== "string" || payload[field].trim() === "";
  });

  if (missing.length > 0) {
    return "Missing required fields: " + missing.join(", ");
  }

  if (payload.contactConsent !== true) {
    return "Contact consent is required";
  }

  if (payload.language !== "ru" && payload.language !== "en") {
    return "Unsupported language";
  }

  if (!isAllowedContact(payload.whatsapp)) {
    return "Invalid WhatsApp number";
  }

  if (typeof payload.email === "string" && payload.email.trim().length > 0 && !isEmail(payload.email)) {
    return "Invalid email address";
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

function buildRow(payload) {
  const comments = buildComments(payload);

  return [
    new Date(),
    sanitizeCellValue(payload.source || ""),
    sanitizeCellValue(payload.language || ""),
    sanitizeCellValue(payload.firstName || ""),
    sanitizeCellValue(payload.lastName || ""),
    sanitizeCellValue(payload.whatsapp || ""),
    sanitizeCellValue(payload.email || ""),
    sanitizeCellValue(payload.service || ""),
    sanitizeCellValue(payload.departure || ""),
    sanitizeCellValue(payload.returnDate || ""),
    sanitizeCellValue(payload.travelers || ""),
    sanitizeCellValue(comments),
    "",
    ""
  ];
}

function getRequestsSheet() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildComments(payload) {
  var lines = [];
  var base = toDisplayString(payload.comments);
  if (base.length > 0) {
    lines.push(base);
  }

  var legacyLines = [];
  var interests = toDisplayList(payload.interests);
  if (interests.length > 0) {
    legacyLines.push("Interests: " + interests.join(", "));
  }

  if (toDisplayString(payload.destinations).length > 0) {
    legacyLines.push("Destinations: " + toDisplayString(payload.destinations));
  }

  if (toDisplayString(payload.foodNeeds).length > 0) {
    legacyLines.push("Food needs: " + toDisplayString(payload.foodNeeds));
  }

  if (toDisplayString(payload.peopleToMeet).length > 0) {
    legacyLines.push("People to meet: " + toDisplayString(payload.peopleToMeet));
  }

  if (toDisplayString(payload.groupStyle).length > 0) {
    legacyLines.push("Group style: " + toDisplayString(payload.groupStyle));
  }

  if (toDisplayString(payload.budget).length > 0) {
    legacyLines.push("Budget: " + toDisplayString(payload.budget));
  }

  if (legacyLines.length > 0) {
    lines.push(legacyLines.join("\n"));
  }

  return lines.join("\n").slice(0, MAX_SPREADSHEET_TEXT_LENGTH);
}

function toDisplayList(value) {
  if (Array.isArray(value)) {
    return value
      .map(toDisplayString)
      .filter(function (item) {
        return item.length > 0;
      });
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map(function (item) {
        return item.trim();
      })
      .filter(function (item) {
        return item.length > 0;
      });
  }

  return [];
}

function toDisplayString(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function sanitizeCellValue(value) {
  var text = toDisplayString(value).slice(0, MAX_SPREADSHEET_TEXT_LENGTH);
  // Google Sheets executes a cell value as a formula only when it starts
  // with "=". Values starting with "+", "-" or "@" are stored as plain
  // text by the Sheets API, so international phone numbers such as
  // "+420 123 456 789" stay unchanged and remain usable for operators and
  // Make.com/Telegram consumers. Only the leading "=" is neutralised with
  // a text marker. (If the sheet is ever exported to CSV and opened in
  // Excel, a broader rule would be needed.)
  if (text.charAt(0) === "=") {
    return "'" + text;
  }
  return text;
}
