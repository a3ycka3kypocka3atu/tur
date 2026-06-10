const SPREADSHEET_ID = "1mRxLlivYxn9Rn9jG4QFJUyJKzIHK5CrFRB961ukwFgw";
const SHEET_NAME = "Requests";

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents);
    const sheet = getRequestsSheet();
    const files = payload.files || {};

    sheet.appendRow([
      new Date(),
      payload.source || "",
      payload.language || "",
      payload.firstName || "",
      payload.lastName || "",
      payload.whatsapp || "",
      payload.email || "",
      payload.service || "",
      payload.departure || "",
      payload.returnDate || "",
      payload.travelers || "",
      payload.comments || "",
      getUploadedFileName(files.dentalScan),
      getUploadedFileName(files.panoramicXray),
    ]);

    return jsonResponse({ status: "success" });
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.message,
    });
  }
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
    sheet.appendRow([
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
      "Dental Scan URL",
      "Panoramic X-ray URL",
    ]);
  }

  return sheet;
}

function getUploadedFileName(file) {
  return file && file.name ? file.name : "";
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
