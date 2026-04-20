function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var data = payload.bills;
  var userName = payload.userName || 'Unknown User';
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Try to find a sheet with the user's name, or create one
  var sheet = ss.getSheetByName(userName);
  if (!sheet) {
    sheet = ss.insertSheet(userName);
    sheet.appendRow([
      'Timestamp', 
      'Bill Name/No', 
      'Type',
      'Step 1: Created', 
      'Step 2: Photo', 
      'Step 3: Uploaded', 
      'Step 4: FMS Filled', 
      'Step 5: Update Sheet', 
      'Details'
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#f3f3f3');
  }
  
  data.forEach(function(bill) {
    sheet.appendRow([
      new Date(),
      bill.name,
      bill.type || 'Final',
      bill.steps.create ? 'YES' : 'NO',
      bill.steps.photo ? 'YES' : 'NO',
      bill.steps.upload ? 'YES' : 'NO',
      bill.steps.fms ? 'YES' : 'NO',
      bill.steps.update ? 'YES' : 'NO',
      bill.details
    ]);
  });
  
  return ContentService.createTextOutput(JSON.stringify({
    'status': 'success',
    'message': 'Saved ' + data.length + ' bills for ' + userName
  })).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput("Bill Checklist Script Active. Waiting for POST data...")
    .setMimeType(ContentService.MimeType.TEXT);
}
