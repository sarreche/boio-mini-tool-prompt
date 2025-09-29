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
    const { email, pin } = await req.json();

    // Verificar el PIN contra Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: process.env.GOOGLE_SHEETS_RANGE,
    });

    const rows = response.data.values || [];
    const isValid = rows.some((row: string[]) => row[1].toLocaleLowerCase() === email.toLocaleLowerCase() && row[2] === pin);

    if (isValid) {
      // Set authentication cookie
      const response = NextResponse.json({ isValid });
      response.cookies.set('isAuthenticated', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7200 // 2 hours
      });
      return response;
    }

    return NextResponse.json({ isValid });
  } catch (error) {
    console.error('Error validating PIN:', error);
    return NextResponse.json({ isValid: false }, { status: 500 });
  }
}