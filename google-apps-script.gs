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
const SHEET_NAME = 'Sheet DB'

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
    const action = e.parameter.action || 'upload'

    switch (action) {
      case 'upload':
        return handleUpload_(e)
      case 'delete':
        return handleDelete_(e)
      case 'update':
        return handleUpdate_(e)
      case 'reorder':
        return handleReorder_(e)
      default:
        throw new Error('Unknown action: ' + action)
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message,
    })).setMimeType(ContentService.MimeType.JSON)
  }
}

// ─── Upload ──────────────────────────────────────────────────────

function handleUpload_(e) {
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

  let finalName = fileName
  const existing = folder.getFilesByName(fileName)
  if (existing.hasNext()) {
    const ts = new Date().getTime()
    finalName = fileName.replace(/\.pdf$/i, '') + '_' + ts + '.pdf'
  }

  const decoded = Utilities.base64Decode(fileData)
  const blob = Utilities.newBlob(decoded, 'application/pdf', finalName)
  const createdFile = folder.createFile(blob)

  syncFromDrive_(SpreadsheetApp.openById(SHEET_ID))

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    fileId: createdFile.getId(),
    fileName: finalName,
  })).setMimeType(ContentService.MimeType.JSON)
}

// ─── Delete ──────────────────────────────────────────────────────

function handleDelete_(e) {
  const fileId = e.parameter.fileId
  const rowId = parseInt(e.parameter.rowId, 10)

  if (!fileId) throw new Error('Missing fileId')
  if (!rowId) throw new Error('Missing rowId')

  // Delete file from Drive
  try {
    DriveApp.getFileById(fileId).setTrashed(true)
  } catch (driveErr) {
    // If file already gone, continue
  }

  // Remove row from sheet
  const ss = SpreadsheetApp.openById(SHEET_ID)
  const sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME)

  const lastRow = sheet.getLastRow()
  if (lastRow < 2) throw new Error('No data rows to delete')

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues()

  // Find row index matching rowId (column A)
  const rowIndex = data.findIndex(function (row) { return row[0] === rowId })
  if (rowIndex === -1) throw new Error('Row not found for id: ' + rowId)

  // Delete that row (rowIndex + 2 because data starts at row 2)
  sheet.deleteRow(rowIndex + 2)

  // Re-index IDs in remaining rows (column A)
  const newLastRow = sheet.getLastRow()
  if (newLastRow >= 2) {
    const remaining = sheet.getRange(2, 1, newLastRow - 1, 1).getValues()
    var reindexed = []
    for (var i = 0; i < remaining.length; i++) {
      reindexed.push([i + 1])
    }
    sheet.getRange(2, 1, reindexed.length, 1).setValues(reindexed)
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    deletedId: rowId,
  })).setMimeType(ContentService.MimeType.JSON)
}

// ─── Update (replace file) ───────────────────────────────────────

function handleUpdate_(e) {
  const oldFileId = e.parameter.fileId
  const fileName = e.parameter.fileName
  const fileData = e.parameter.fileData

  if (!oldFileId) throw new Error('Missing fileId')
  if (!fileName || !fileData) throw new Error('Missing fileName or fileData')
  if (!fileName.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF files are allowed')

  // Trash old file
  try {
    DriveApp.getFileById(oldFileId).setTrashed(true)
  } catch (driveErr) {
    // Continue even if old file is gone
  }

  // Create new file
  const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID)
  const decoded = Utilities.base64Decode(fileData)
  const blob = Utilities.newBlob(decoded, 'application/pdf', fileName)
  const createdFile = folder.createFile(blob)

  // Update gdrivePath in sheet
  const ss = SpreadsheetApp.openById(SHEET_ID)
  const sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME)

  const lastRow = sheet.getLastRow()
  if (lastRow < 2) throw new Error('No data rows to update')

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues()

  for (var i = 0; i < data.length; i++) {
    if (data[i][3] === oldFileId) {
      // Column D = gdrivePath (0-indexed: column index 3)
      sheet.getRange(i + 2, 4).setValue(createdFile.getId())
      break
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    fileId: createdFile.getId(),
    fileName: fileName,
  })).setMimeType(ContentService.MimeType.JSON)
}

// ─── Reorder ─────────────────────────────────────────────────────

function handleReorder_(e) {
  const orderJson = e.parameter.order
  if (!orderJson) throw new Error('Missing order parameter')

  var newOrder = JSON.parse(orderJson)
  if (!Array.isArray(newOrder) || newOrder.length === 0) {
    throw new Error('Invalid order data')
  }

  const ss = SpreadsheetApp.openById(SHEET_ID)
  const sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME)

  const lastRow = sheet.getLastRow()
  if (lastRow < 2) throw new Error('No data rows to reorder')

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues()

  // Build a map of id → row data
  var dataMap = {}
  for (var i = 0; i < data.length; i++) {
    dataMap[data[i][0]] = data[i]
  }

  // Build new rows in the requested order, reassign IDs sequentially
  var newRows = []
  for (var j = 0; j < newOrder.length; j++) {
    var row = dataMap[newOrder[j]]
    if (row) {
      row[0] = j + 1 // reassign id
      newRows.push(row)
    }
  }

  if (newRows.length === 0) throw new Error('No matching rows found')

  // Clear existing data and write new rows
  sheet.getRange(2, 1, lastRow - 1, 5).clear()
  sheet.getRange(2, 1, newRows.length, 5).setValues(newRows)

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    count: newRows.length,
  })).setMimeType(ContentService.MimeType.JSON)
}

// ─── Sync ────────────────────────────────────────────────────────

function syncFromDrive() {
  syncFromDrive_(SpreadsheetApp.getActiveSpreadsheet())
}

function syncFromDrive_(ss) {
  const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID)
  const files = folder.getFiles()
  const sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME)

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
