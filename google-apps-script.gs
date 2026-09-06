/* ============================================================
   AKKOUS — Google Apps Script Backend
   
   DEPLOYMENT INSTRUCTIONS:
   
   1. Go to https://script.google.com and create a new project
   2. Replace the default code with this entire file
   3. Update the configuration constants below
   4. Run the function "setupSheet" once (select it, click Run)
      → creates the "Project Requests" sheet with column headers
   5. Click "Deploy" > "New deployment"
   6. Select type: "Web app"
   7. Execute as: "Me"
   8. Who has access: "Anyone"
   9. Click "Deploy" and copy the Web App URL
   10. Paste the URL into js/config.js > GOOGLE_SCRIPT_API_URL
   
   ============================================================ */

/* ---- CONFIGURATION ---- */

// Your Google Spreadsheet ID (from the URL: docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit)
const SPREADSHEET_ID = "VOTRE_SPREADSHEET_ID";

// Sheet tab name
const SHEET_NAME = "Project Requests";

// Admin email for notifications
const ADMIN_EMAIL = "MON_EMAIL@gmail.com";

// Agency name used in client confirmation email
const AGENCY_NAME = "AKKOUS";

// Max description length (must match frontend config)
const MAX_DESCRIPTION_LENGTH = 5000;


/* ---- DO GET (required for Web App deployment) ---- */

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ success: true, message: "AKKOUS Project Request API is running." })
  ).setMimeType(ContentService.MimeType.JSON);
}


/* ---- DO POST (main entry point) ---- */

function doPost(e) {
  var lock = LockService.getScriptLock();
  
  try {
    // Acquire lock to prevent concurrent write issues
    lock.waitLock(10000);
    
    var data = JSON.parse(e.postData.contents);
    
    // --- Validate required fields ---
    var name  = trim(data.name);
    var email = trim(data.email);
    var whatsapp = trim(data.whatsapp);
    var desc  = trim(data.projectDescription);
    
    if (!name || !email || !whatsapp || !desc) {
      return jsonResponse(false, "All fields are required.");
    }
    
    // --- Validate email format ---
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(false, "Invalid email address.");
    }
    
    // --- Validate description length ---
    if (desc.length > MAX_DESCRIPTION_LENGTH) {
      return jsonResponse(false, "Project description exceeds the maximum allowed length.");
    }
    
    // --- Write to Google Sheets ---
    var sheet = getOrCreateSheet();
    var timestamp = new Date();
    
    sheet.appendRow([
      timestamp,    // Date
      name,         // Client Name
      email,        // Email
      whatsapp,     // WhatsApp
      desc,         // Project Description
      "New"         // Status
    ]);
    
    // --- Send admin notification email ---
    sendAdminEmail(name, email, whatsapp, desc, timestamp);
    
    // --- Send client confirmation email ---
    sendClientEmail(name, email);
    
    Logger.log("Request received from: " + name + " (" + email + ")");
    return jsonResponse(true, "Project request successfully received");
    
  } catch (err) {
    Logger.log("Error: " + err.message);
    return jsonResponse(false, "Server error. Please try again later.");
    
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


/* ---- HELPERS ---- */

function trim(val) {
  return (typeof val === "string") ? val.trim() : "";
}

function jsonResponse(success, message) {
  return ContentService.createTextOutput(
    JSON.stringify({ success: success, message: message })
  ).setMimeType(ContentService.MimeType.JSON);
}


/* ---- SPREADSHEET ---- */

/**
 * Run this function manually from the Apps Script editor to
 * create/initialize the sheet with its column headers.
 * Select the function "setupSheet" and click "Run".
 */
function setupSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    Logger.log("Sheet \"" + SHEET_NAME + "\" created.");
  }

  writeHeaders(sheet);
  Logger.log("Headers ready on \"" + SHEET_NAME + "\": Date | Client Name | Email | WhatsApp | Project Description | Status");
  Logger.log("Spreadsheet URL: " + ss.getUrl());
}

function getOrCreateSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    writeHeaders(sheet);
  }

  return sheet;
}

/**
 * Writes the column headers at row 1 and formats them.
 * Idempotent: skipped when headers already exist, and never
 * overwrites a first row that already contains data.
 */
function writeHeaders(sheet) {
  var HEADERS = [
    "Date",
    "Client Name",
    "Email",
    "WhatsApp",
    "Project Description",
    "Status"
  ];

  // Already set up — do not duplicate
  if (sheet.getRange(1, 1).getValue() === HEADERS[0]) return;

  // Row 1 has data but no headers — do not clobber it
  var firstRowHasData = sheet.getRange(1, 1, 1, HEADERS.length)
    .isBlank()[0]
    .some(function (blank) { return !blank; });
  if (firstRowHasData) {
    Logger.log("Warning: row 1 already contains data without headers. Headers NOT written on \"" + SHEET_NAME + "\".");
    return;
  }

  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setValues([HEADERS]);

  // Format header row
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1a1d2e");
  headerRange.setFontColor("#ffffff");

  // Set column widths
  sheet.setColumnWidth(1, 160);  // Date
  sheet.setColumnWidth(2, 180);  // Name
  sheet.setColumnWidth(3, 220);  // Email
  sheet.setColumnWidth(4, 160);  // WhatsApp
  sheet.setColumnWidth(5, 400);  // Description
  sheet.setColumnWidth(6, 100);  // Status

  // Freeze header row
  sheet.setFrozenRows(1);
}


/* ---- ADMIN EMAIL NOTIFICATION ---- */

function sendAdminEmail(name, email, whatsapp, desc, timestamp) {
  var subject = "\uD83D\uDD14 New Project Request \u2013 " + name;
  
  var body =
    "Hello,\n\n" +
    "You have received a new project request.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "Client Name:\n" + name + "\n\n" +
    "Email:\n" + email + "\n\n" +
    "WhatsApp:\n" + whatsapp + "\n\n" +
    "Project Description:\n" + desc + "\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "Date: " + timestamp + "\n\n" +
    "Please check your Google Sheet to manage this request.\n\n" +
    "Regards,\n" + AGENCY_NAME + " Website";
  
  MailApp.sendEmail(ADMIN_EMAIL, subject, body);
}


/* ---- CLIENT CONFIRMATION EMAIL ---- */

function sendClientEmail(name, clientEmail) {
  var subject = "Thank You for Your Project Request";
  
  var body =
    "Hello " + name + ",\n\n" +
    "Thank you for contacting us and for sharing your project with us.\n\n" +
    "We have successfully received your request and our team will carefully review the details you provided.\n\n" +
    "A member of our team will contact you soon to discuss your project and the next steps.\n\n" +
    "Best regards,\n" +
    AGENCY_NAME;
  
  MailApp.sendEmail(clientEmail, subject, body);
}
