# Form to Google Sheets Setup

The browser never talks to Google directly. The request goes through a
same-origin Vercel function that validates the payload, forwards it to the
Apps Script web app and confirms the actual backend result before the form
shows success.

```text
browser form
  -> POST /api/submit (same-origin Vercel function, api/submit.js)
  -> POST Apps Script /exec web app
  -> append row to the Requests sheet
  -> confirmed "success" response travels back
  -> frontend resets the form
```

## 1. Create the Google Sheet

1. Create a Google Sheet for requests.
2. Open `Extensions -> Apps Script`.
3. Paste the contents of `google-apps-script.gs` into the Apps Script editor.
4. Copy the Google Sheet ID from the sheet URL and paste it into
   `SPREADSHEET_ID` in the script.

Example sheet URL:

```text
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
```

If `Extensions -> Apps Script` opens a Google Drive error page, create the
script directly:

1. Open `https://script.google.com/home/projects/create`.
2. Paste the contents of `google-apps-script.gs`.
3. Paste your sheet ID into `SPREADSHEET_ID`.

The sheet tab is created automatically as `Requests` (with header row) after
the first submission, or on the first successful append.

## 2. Deploy the Apps Script endpoint

1. In Apps Script, click `Deploy -> New deployment`.
2. Choose `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Copy the Web App URL ending in `/exec`.

Verify the deployment:

```text
GET <web-app-url>/exec -> {"status":"ok","message":"AC Travel form endpoint is live"}
```

If GET returns an HTML page with "Script function not found: doGet", the
deployment is stale: redeploy the current script revision (and re-publish it
as a new version if needed).

## 3. Connect the site

The Vercel function `api/submit.js` reads the Apps Script URL from the
`APPS_SCRIPT_ENDPOINT` environment variable. If the variable is not set, it
falls back to the URL hardcoded in `api/submit.js`.

1. In Vercel project settings, add the environment variable:

   ```text
   APPS_SCRIPT_ENDPOINT=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```

2. Redeploy the Vercel project.

The frontend always submits to `/api/submit`; no frontend change is needed.

## 4. Connect Make.com

Use this scenario:

```text
Google Sheets: Watch New Rows -> Telegram Bot: Send a Message
```

The travel profile keeps the existing sheet structure compatible. The
selected role is saved in `Service`; interests, destination ideas, budget,
preferred stays, activity, Wi-Fi, food needs and the people a traveler hopes
to meet are saved as structured lines inside `Comments`.

Recommended Telegram message fields:

```text
New AC Travel request
Name: {{First Name}} {{Last Name}}
WhatsApp: {{WhatsApp}}
Email: {{Email}}
Role: {{Service}}
Dates: {{Departure Date}} - {{Return Date}}
Travelers: {{Number of Travelers}}
Travel profile:
{{Comments}}
```

## Requests sheet columns

The column layout is unchanged for backwards compatibility:

```text
Submitted At | Source | Language | First Name | Last Name | WhatsApp | Email |
Service | Departure Date | Return Date | Number of Travelers | Comments |
Dental Scan File Name | Panoramic X-ray File Name
```

The last two columns are legacy. File upload was intentionally removed in
T3.1 (the platform does not collect or store medical/dental documents), and
the backend always writes them empty. They can be deleted manually in an
existing sheet if operators prefer a shorter layout.

## Health & Care

Health & Care remains an interest and service direction. Users select the
role "Health & Care" or the "Health & Care" interest in the form; no files
are collected and no Drive storage is used.

## Interest taxonomy

The canonical interest vocabulary (used by discovery links, journey filters,
interest checkboxes and journey card categories) is:

```text
nature | retreat | food | community | stays | remote | active | care
```

Journey card categories use a subset of these keys (`nature`, `retreat`,
`community`, `remote`). The single source of truth in code is the
`INTEREST_KEYS` constant at the top of `script.js`; new interests must be
added there together with RU/EN labels in `index.html` / the `english`
dictionary in `script.js`.

## Request field mapping

The frontend (`script.js`) flattens the travel profile into the `Comments`
column deterministically, so no profile information is lost despite the
14-column legacy sheet layout:

```text
form field          -> payload key  -> Sheet column / representation
---------------------+---------------+-------------------------------------
submitted at         | submittedAt   | ignored by backend (sheet writes its
                     |               | own append time into Submitted At)
source/context       | source        | Source ("AC Travel Website")
language             | language      | Language (ru | en, required)
first name           | firstName     | First Name (required)
last name            | lastName      | Last Name (required)
WhatsApp / phone     | whatsapp      | WhatsApp (required)
email (optional)     | email         | Email (empty when not supplied)
role/service         | service       | Service (traveler|private|host|care)
departure date       | departure     | Departure Date
return date          | returnDate    | Return Date
traveler count       | travelers     | Number of Travelers
interests            | comments      | "Interests: nature, food, ..." line
destinations         | comments      | "Destinations: ..." line
budget               | comments      | "Budget: ..." line
group format         | comments      | "Group style: ..." line
stay types           | comments      | "Stay types: ..." line
activity level       | comments      | "Activity: ..." line
Wi-Fi requirement    | comments      | "Wi-Fi: ..." line
food requirements    | comments      | "Food needs: ..." line
people to meet       | comments      | "People to meet: ..." line
free comments        | comments      | "Notes: ..." line
contact consent      | contactConsent| validated on both sides; not stored
                     |               | (no sheet column exists for it)
```

The flattening always writes all ten lines, with `—` for empty values, so the
`Comments` cell format is stable for Make.com parsing. Empty optional values
(email, dates) are stored as empty strings and never break the flow.

## Spreadsheet formula safety

User-controlled values are sanitised in `google-apps-script.gs`
(`sanitizeCellValue`) immediately before `appendRow`:

- a value whose trimmed content starts with `=` gets a leading `'` text
  marker, e.g. `=SUM(1,1)` is stored as `'=SUM(1,1)` and can never execute;
- all other values are stored unchanged.

Rationale: Google Sheets only executes cell content that starts with `=`.
Values starting with `+`, `-` or `@` are plain text in the Sheets API, so
international phone numbers such as `+420 123 456 789` stay pristine and
remain directly usable for operators and Make.com/Telegram. (If the sheet is
ever exported to CSV and opened in Excel, a broader rule would be needed;
the documented consumption path is the Sheets API via Make.com.)

## Failure behaviour

The frontend only reports success after the Apps Script web app has
confirmed the row was appended:

- while a request is pending the submit button is disabled (duplicate
  clicks are ignored);
- on failure the localized error message is shown, all form values stay in
  place and the button is re-enabled so the user can retry;
- the form is reset only on confirmed success;
- the Vercel function returns structured error codes (400/413/502) and
  never exposes backend internals to the browser.

## Verifying a real submission

After deploying everything:

1. Open the site and submit the form with a test request.
2. Check the `Requests` tab of the Google Sheet: a new row must appear with
   the flattened travel profile in `Comments` and empty legacy file columns.
3. Check the Make.com scenario received the new row (Telegram message).
4. Submit the form again with invalid input (e.g. a bad phone number) and
   confirm the form shows the error message and keeps the entered values.

## Local tests

The repository ships a zero-dependency Node test suite:

```text
npm test        # runs tests/run.js
```

It covers proxy validation, Apps Script row building and sanitisation,
frontend-to-sheet field fidelity (RU and EN, unicode, arrays, optional
values, malicious formula-like input) and the form runtime behaviour (i18n,
menu, FAQ, filters, prefills, submit states). No external services are
called; the upstream is mocked.
