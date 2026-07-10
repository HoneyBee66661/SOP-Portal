/**
 * Google Apps Script — Auto-populate Google Sheet from Drive folder
 *
 * How to install:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Paste this entire file
 * 3. Click Save → Run "syncFromDrive" → Authorize
 * 4. Refresh the sheet — you'll see a custom menu "Document Portal"
 *    Click it → "Sync from Drive" to pull new PDFs from the folder.
 */

const UPLOAD_FOLDER_ID = '1bYE7lE42KZTQ2Ki5jYghdu2Njx-2Nnug'
const SHEET_NAME = 'Sheet1'

function onOpen() {
  const ui = SpreadsheetApp.getUi()
  ui.createMenu('Document Portal')
    .addItem('Sync from Drive', 'syncFromDrive')
    .addToUi()
}

function syncFromDrive() {
  const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID)
  const files = folder.getFiles()
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
  if (!sheet) return

  const existing = getExistingData(sheet)
  const newRows = []
  let maxId = existing.length > 0 ? Math.max(...existing.map(r => r.id || 0)) : 0

  while (files.hasNext()) {
    const file = files.next()
    const name = file.getName()
    const fileId = file.getId()

    // Skip if already in sheet
    if (existing.some(r => r.gdrivePath === fileId)) continue

    maxId++
    newRows.push([
      maxId,
      name.replace(/\.pdf$/i, ''),
      '',
      '',
      fileId,
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
    description: row[3],
    gdrivePath: row[4],
  }))
}
