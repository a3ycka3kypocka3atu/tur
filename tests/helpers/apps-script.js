const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadAppsScript() {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "google-apps-script.gs"), "utf8");

  const rows = [];
  const events = [];
  let sheetExists = true;

  const spreadsheet = {
    getSheetByName(name) {
      if (!sheetExists) {
        return null;
      }

      return {
        getLastRow() {
          return rows.length;
        },
        appendRow(row) {
          events.push("append");
          rows.push(row);
        },
      };
    },
    insertSheet(name) {
      sheetExists = true;
      return spreadsheet.getSheetByName(name);
    },
  };

  const sandbox = {
    SpreadsheetApp: {
      openById: () => spreadsheet,
      getActiveSpreadsheet: () => spreadsheet,
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput(text) {
        return {
          text,
          setMimeType() {
            return this;
          },
        };
      },
    },
    console,
    Date,
    JSON,
    String,
    Array,
    Number,
    Object,
    Error,
    RegExp,
    Math,
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);

  return { api: sandbox, rows, events };
}

function postToSheet(loaded, payload) {
  const output = loaded.api.doPost({ postData: { contents: JSON.stringify(payload) } });
  return JSON.parse(output.text);
}

function getFromSheet(loaded) {
  const output = loaded.api.doGet();
  return JSON.parse(output.text);
}

module.exports = { loadAppsScript, postToSheet, getFromSheet };
