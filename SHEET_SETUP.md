# 📊 Google Sheets Integration Setup

Follow these steps to automatically save every form submission into a Google Spreadsheet.

---

## Step 1 — Create a Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. Name the first sheet **`Submissions`**.
3. In row 1, add these column headers exactly:

| A         | B    | C     | D     | E    | F          | G     | H    | I          |
| --------- | ---- | ----- | ----- | ---- | ---------- | ----- | ---- | ---------- |
| Timestamp | Name | Email | Phone | Game | Game Title | Score | Mode | Profile ID |

---

## Step 2 — Create the Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**.
2. Delete any existing code and paste the following:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Submissions");
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.name || "",
      data.email || "",
      data.phone || "",
      data.game || "",
      data.gameTitle || "",
      data.score || 0,
      data.mode || "",
      data.profileId || "",
    ]);
    return ContentService.createTextOutput(
      JSON.stringify({ status: "ok" }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.toString() }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click **Save** (name the project anything, e.g. `TournamentSubmissions`).

---

## Step 3 — Deploy as Web App

1. Click **Deploy → New deployment**.
2. Choose type: **Web app**.
3. Set:
   - **Execute as**: Me (your Google account)
   - **Who has access**: **Anyone**
4. Click **Deploy**, then **Authorize** when prompted.
5. Copy the **Web app URL** (it looks like `https://script.google.com/macros/s/XXXX.../exec`).

---

## Step 4 — Paste the URL into script.js

Open `script.js` and find this line near the top:

```javascript
const SHEET_WEBHOOK_URL = ""; // <-- paste your Apps Script web app URL here
```

Replace the empty string with your URL:

```javascript
const SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

Save and re-deploy the website. Every time a player submits their score, a new row will be appended to your sheet — including a timestamp, so you can see when each submission happened and identify players who played on multiple browsers.

---

## How duplicates work

- **Same browser, same game**: The player won't be asked for their details again. Their previous form data is recalled from localStorage.
- **Different browser / device (same email)**: A new row is always saved to the sheet (so you can see multiple plays). On the leaderboard, the highest score for each `profileId` is shown.
- **You will see duplicates in the sheet** — this is intentional and desired.
