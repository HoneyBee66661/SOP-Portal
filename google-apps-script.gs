/**
 * Google Apps Script — Auto-populate Google Sheet from Drive folder
 *
 * How to install:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Paste this entire file
 * 3. Click Save → Run "syncFromDrive" → Authorize
 * 4. Refresh the sheet — you'll see a custom menu "Document Portal"
 * 5. Deploy as web app: Deploy → New → Web app → Execute as: Me → Access: Anyone → Deploy
 * 6. Copy the web app URL and update SYNC_URL in AdminPage.jsx
 */

const UPLOAD_FOLDER_ID = '1bYE7lE42KZTQ2Ki5jYghdu2Njx-2Nnug'
const SHEET_ID = '1c_qGvb1jpfL5SZFeuRxKsQO4ddyPJlSFObsyFG4wItc'
const SHEET_NAME = 'Sheet1'

function onOpen() {
  const ui = SpreadsheetApp.getUi()
  ui.createMenu('Document Portal')
    .addItem('Sync from Drive', 'syncFromDrive')
    .addToUi()
}

function doGet() {
  try {
    syncFromDrive_(SpreadsheetApp.openById(SHEET_ID))
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON)
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: e.message }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

function doPost(e) {
  try {
    const fileName = e.parameter.fileName
    const fileData = e.parameter.fileData

    if (!fileName || !fileData) {
      throw new Error('Missing fileName or fileData')
    }

    if (!fileName.toLowerCase().endsWith('.pdf')) {
      throw new Error('Only PDF files are allowed')
    }

    if (!fileData.startsWith('JVBERi0')) {
      throw new Error('File does not appear to be a valid PDF')
    }

    const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID)

    // Handle duplicate filename
    let finalName = fileName
    const existing = folder.getFilesByName(fileName)
    if (existing.hasNext()) {
      const ts = new Date().getTime()
      finalName = fileName.replace(/\.pdf$/i, '') + '_' + ts + '.pdf'
    }

    const decoded = Utilities.base64Decode(fileData)
    const blob = Utilities.newBlob(decoded, 'application/pdf', finalName)
    const createdFile = folder.createFile(blob)

    // Sync sheet
    syncFromDrive_(SpreadsheetApp.openById(SHEET_ID))

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: createdFile.getId(),
      fileName: finalName,
    })).setMimeType(ContentService.MimeType.JSON)

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: e.message,
    })).setMimeType(ContentService.MimeType.JSON)
  }
}

function syncFromDrive() {
  syncFromDrive_(SpreadsheetApp.getActiveSpreadsheet())
}

function syncFromDrive_(ss) {
  const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID)
  const files = folder.getFiles()
  const sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) return

  const existing = getExistingData(sheet)
  const newRows = []
  let maxId = existing.length > 0 ? Math.max(...existing.map(r => r.id || 0)) : 0

  while (files.hasNext()) {
    const file = files.next()
    const name = file.getName()
    const fileId = file.getId()

    if (existing.some(r => r.gdrivePath === fileId)) continue

    maxId++
    newRows.push([
      maxId,
      name.replace(/\.pdf$/i, ''),
      '',
      fileId,
      '',
    ])
  }

  if (newRows.length > 0) {
    const lastRow = sheet.getLastRow()
    const startRow = lastRow >= 1 ? lastRow + 1 : 1
    sheet.getRange(startRow, 1, newRows.length, 5).setValues(newRows)
  }
}

function getExistingData(sheet) {
  const lastRow = sheet.getLastRow()
  if (lastRow < 2) return []
  const rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues()
  return rows.map(row => ({
    id: row[0],
    title: row[1],
    category: row[2],
    gdrivePath: row[3],
    description: row[4],
  }))
}
