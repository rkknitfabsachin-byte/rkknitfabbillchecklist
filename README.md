# Bill Checklist Pro

A premium, high-efficiency workflow tool designed for daily bill creation and tracking.

## Features
- **Real-time Step Tracking**: Check off each stage of your bill creation (Create, Photo, Group Upload, FMS, Bill Update).
- **Infinite Scalability**: Easily manage 10, 20, or 30+ bills in a clean, visual grid.
- **Progress Monitoring**: Visual bars and statistics show your overall completion rate.
- **Smart Notes**: Each bill has a dedicated details section for random notes.
- **Cloud Sync**: Export all your data directly to Google Sheets with one click.
- **Persistence**: Your work is automatically saved in your browser, even if you refresh.

## How to Connect Google Sheets

1.  Open [Google Sheets](https://sheets.google.com).
2.  Go to **Extensions** > **Apps Script**.
3.  Delete any existing code and paste the following:

    ```javascript
    function doPost(e) {
      var data = JSON.parse(e.postData.contents);
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      
      data.forEach(function(bill) {
        sheet.appendRow([
          new Date(),
          bill.name,
          bill.steps.create ? 'YES' : 'NO',
          bill.steps.photo ? 'YES' : 'NO',
          bill.steps.upload ? 'YES' : 'NO',
          bill.steps.fms ? 'YES' : 'NO',
          bill.steps.update ? 'YES' : 'NO',
          bill.details
        ]);
      });
      
      return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    ```

4.  Click **Deploy** > **New Deployment**.
5.  Select type: **Web App**.
6.  Description: `Bill Checklist Sync`.
7.  Execute as: **Me**.
8.  Who has access: **Anyone**.
9.  Click **Deploy**, authorize permissions, and copy the **Web App URL**.
10. In the checklist app, click **Save to Sheets**, paste the URL, and save.

## Designed for Efficiency
Built with a "Glassmorphism" aesthetic, this app uses high-contrast dark modes and micro-animations to make your daily repetitive tasks feel premium and precise.
