const fs = require("fs");
const path = require("path");
const { test, section, summary } = require("./helpers/assert");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "script.js"), "utf8");
const gs = fs.readFileSync(path.join(root, "google-apps-script.gs"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function dictKeys(source) {
  const match = source.match(/const english = \{([\s\S]*?)\n\};/);
  if (!match) throw new Error("english dictionary not found");
  return new Set([...match[1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
}

section("static: i18n consistency");
test("every data-i18n* key in index.html exists in the english dictionary and vice versa", () => {
  const htmlKeys = new Set();
  for (const m of html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)) htmlKeys.add(m[1]);
  const jsKeys = dictKeys(js);
  const missing = [...htmlKeys].filter((k) => !jsKeys.has(k));
  const extra = [...jsKeys].filter((k) => !htmlKeys.has(k));
  if (missing.length || extra.length) {
    throw new Error("mismatch: missing=" + missing.join(",") + " extra=" + extra.join(","));
  }
});
test("no dead translation keys from the removed upload feature remain", () => {
  for (const dead of ["careUploadSummary", "careUploadNote", "uploadScanLabel", "uploadXrayLabel", "missing", "tooLarge"]) {
    if (js.includes(dead)) throw new Error("dead key still present: " + dead);
    if (html.includes('data-i18n="' + dead + '"')) throw new Error("dead html key still present: " + dead);
  }
});
section("static: interest taxonomy consistency");
test("INTEREST_KEYS matches the form checkbox values exactly", () => {
  const match = js.match(/const INTEREST_KEYS = (\[[^\]]+\])/);
  if (!match) throw new Error("INTEREST_KEYS not found");
  const keys = JSON.parse(match[1].replace(/'/g, '"'));
  const boxes = [...html.matchAll(/name="interests" value="([^"]+)"/g)].map((m) => m[1]);
  if (JSON.stringify(keys.sort()) !== JSON.stringify(boxes.sort())) {
    throw new Error("mismatch: keys=" + keys.join(",") + " boxes=" + boxes.join(","));
  }
});
test("filter buttons and journey card categories use canonical keys", () => {
  const filters = [...html.matchAll(/data-offer-filter="([^"]+)"/g)].map((m) => m[1]);
  const categories = new Set();
  for (const m of html.matchAll(/data-offer-category="([^"]+)"/g)) {
    m[1].split(" ").forEach((c) => categories.add(c));
  }
  for (const key of [...filters, ...categories]) {
    if (!["all", "nature", "retreat", "community", "remote"].includes(key)) {
      throw new Error("non-canonical key: " + key);
    }
  }
});

section("static: medical uploads and dead links removed");
test("no file inputs or upload code remain", () => {
  if (html.includes('type="file"')) throw new Error("file input found in html");
  for (const token of ["dentalScan", "panoramicXray", "DRIVE_FOLDER", "FileReader", "fileToPayload", "MAX_UPLOAD_SIZE"]) {
    if (js.includes(token) || gs.includes(token)) throw new Error("upload leftover: " + token);
  }
});
test("dead WhatsApp/Telegram/AlbaniaCare links removed", () => {
  for (const token of ["wa.me/", "t.me/", "albaniacare.travel"]) {
    if (html.includes(token) || js.includes(token)) throw new Error("dead link token: " + token);
  }
});
test("all asset references resolve to files that exist", () => {
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|content)="(assets\/[^"]+)"/g)) refs.add(m[1]);
  for (const m of css.matchAll(/url\("(assets\/[^"]+)"\)/g)) refs.add(m[1]);
  for (const ref of refs) {
    if (!fs.existsSync(path.join(root, ref))) throw new Error("missing asset: " + ref);
  }
});
test("deleted png assets are not referenced anywhere", () => {
  for (const token of ["albania-coast-road.png", "dental-clinic.png"]) {
    if (html.includes(token) || css.includes(token) || js.includes(token)) throw new Error("orphaned png reference: " + token);
  }
});

section("static: architecture consistency");
test("proxy and Apps Script required fields match", () => {
  const proxySource = fs.readFileSync(path.join(root, "api", "submit.js"), "utf8");
  const proxy = JSON.parse(proxySource.match(/REQUIRED_FIELDS = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  const gsMatch = gs.match(/REQUIRED_FIELDS = (\[[^\]]+\])/);
  const apps = JSON.parse(gsMatch[1].replace(/'/g, '"'));
  if (JSON.stringify(proxy.sort()) !== JSON.stringify(apps.sort())) throw new Error("required fields differ");
});
test("frontend submits to the same-origin proxy endpoint only", () => {
  if (!js.includes('const FORM_ENDPOINT = "/api/submit"')) throw new Error("FORM_ENDPOINT missing");
  if (js.includes("script.google.com")) throw new Error("frontend must not talk to Google directly");
  if (js.includes("no-cors")) throw new Error("no-cors must not be used");
});
test("sheet schema remains the 14-column layout with legacy file columns", () => {
  const headers = JSON.parse(gs.match(/const HEADERS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
  if (headers.length !== 14) throw new Error("expected 14 columns, got " + headers.length);
  if (headers[12] !== "Dental Scan File Name" || headers[13] !== "Panoramic X-ray File Name") throw new Error("legacy columns changed");
});
test("form has native required validation on the key fields", () => {
  for (const name of ["firstName", "lastName", "whatsapp", "service", "travelers", "contactConsent"]) {
    const tag = html.match(new RegExp('name="' + name + '"[^>]*'));
    if (!tag || !/required/.test(tag[0])) throw new Error("required missing on " + name);
  }
});
