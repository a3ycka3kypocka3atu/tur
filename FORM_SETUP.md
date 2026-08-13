# Form to Google Sheets Setup

## 1. Create the Google Sheet

1. Create a Google Sheet for requests.
2. Open `Extensions -> Apps Script`.
3. Paste the contents of `google-apps-script.gs` into the Apps Script editor.
4. If uploads should be saved to Google Drive, create a Drive folder and paste its folder ID into `DRIVE_FOLDER_ID`.

The sheet tab will be created automatically as `Requests` after the first submission.

If `Extensions -> Apps Script` opens a Google Drive error page, create the script directly:

1. Open `https://script.google.com/home/projects/create`.
2. Paste the contents of `google-apps-script.gs`.
3. Copy the Google Sheet ID from the sheet URL and paste it into `SPREADSHEET_ID`.

Example sheet URL:

```text
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
```

## 2. Deploy the Apps Script endpoint

1. In Apps Script, click `Deploy -> New deployment`.
2. Choose `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Copy the Web App URL ending in `/exec`.

## 3. Connect the site

Open `script.js` and replace:

```js
const GOOGLE_SHEETS_ENDPOINT = "";
```

with:

```js
const GOOGLE_SHEETS_ENDPOINT = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

After that, the Submit button will send each request to Google Sheets.

## 4. Connect Make.com

Use this scenario:

```text
Google Sheets: Watch New Rows -> Telegram Bot: Send a Message
```

The broader travel profile keeps the existing sheet structure compatible. The
selected role is saved in `Service`; interests, destination ideas, budget,
preferred stays, activity, Wi-Fi, food needs and the people a traveler hopes to
meet are saved as structured lines inside `Comments`.

Recommended Telegram message fields:

```text
New AC Travel profile
Name: {{First Name}} {{Last Name}}
WhatsApp: {{WhatsApp}}
Email: {{Email}}
Role: {{Service}}
Dates: {{Departure Date}} - {{Return Date}}
Travelers: {{Number of Travelers}}
Dental scan: {{Dental Scan URL}}
Panoramic X-ray: {{Panoramic X-ray URL}}
Travel profile:
{{Comments}}
```
