import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Verificar el email contra Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: process.env.GOOGLE_SHEETS_RANGE,
    });

    const rows = response.data.values || [];
    const isValid = rows.some((row: string[]) => row[1].toLowerCase() === email.toLowerCase());

    return NextResponse.json({ isValid });
  } catch (error) {
    console.error('Error validating email:', error);
    return NextResponse.json({ isValid: false }, { status: 500 });
  }
}