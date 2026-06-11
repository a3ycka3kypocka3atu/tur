const SPREADSHEET_ID = "1mRxLlivYxn9Rn9jG4QFJUyJKzIHK5CrFRB961ukwFgw";
const SHEET_NAME = "Requests";

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents);
    const files = payload.files || {};
    const sheet = getRequestsSheet();
    const row = [];

    row.push(new Date());
    row.push(payload.source || "");
    row.push(payload.language || "");
    row.push(payload.firstName || "");
    row.push(payload.lastName || "");
    row.push(payload.whatsapp || "");
    row.push(payload.email || "");
    row.push(payload.service || "");
    row.push(payload.departure || "");
    row.push(payload.returnDate || "");
    row.push(payload.travelers || "");
    row.push(payload.comments || "");
    row.push(getUploadedFileName(files.dentalScan));
    row.push(getUploadedFileName(files.panoramicXray));

    sheet.appendRow(row);

    return jsonResponse({ status: "success" });
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.message
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
    const headers = "Submitted At|Source|Language|First Name|Last Name|WhatsApp|Email|Service|Departure Date|Return Date|Number of Travelers|Comments|Dental Scan File Name|Panoramic X-ray File Name";
    sheet.appendRow(headers.split("|"));
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
