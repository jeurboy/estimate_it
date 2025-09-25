import { google } from 'googleapis';

/**
 * Extracts the spreadsheet ID from a Google Sheet URL.
 * @param url The full Google Sheet URL.
 * @returns The spreadsheet ID.
 * @throws If the URL is invalid or the ID cannot be found.
 */
function getSpreadsheetIdFromUrl(url: string): string {
  // Regex to capture the spreadsheet ID from various Google Sheets URL formats
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match || !match[1]) {
    throw new Error('Invalid Google Sheet URL. Could not extract spreadsheet ID.');
  }
  return match[1];
}

/**
 * Fetches the content of cell A1 from the 'Config' sheet of a public Google Sheet.
 *
 * @param googleSheetUrl The URL of the public Google Sheet.
 * @param googleApiKey The Google API key with access to the Sheets API.
 * @returns A promise that resolves to the content of cell A1 as a string.
 * @throws If the API call fails or the cell is empty.
 */
export async function getPromptFromSheet(googleSheetUrl: string, googleApiKey: string): Promise<string> {
  try {
    const spreadsheetId = getSpreadsheetIdFromUrl(googleSheetUrl);
    const sheets = google.sheets({ version: 'v4', auth: googleApiKey });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Config!A1', // Fetch cell A1 from the 'Config' sheet
    });

    const values = response.data.values;
    if (!values || values.length === 0 || !values[0][0]) {
      throw new Error("The prompt cell (Config!A1) in your Google Sheet is empty or could not be found.");
    }

    return values[0][0];
  } catch (error: any) {
    console.error('Google Sheets API Error:', error.message);
    // Provide a more specific error message for common issues
    if (error.code === 403) {
      throw new Error('Failed to access Google Sheet. Please ensure the sheet is public ("Anyone with the link can view") and the Google API key is correct and has the Sheets API enabled.');
    }
    if (error.code === 404) {
      throw new Error("The specified Google Sheet was not found. Please check the URL.");
    }
    throw new Error(`Failed to fetch prompt from Google Sheet: ${error.message}`);
  }
}