import { google } from "googleapis";

export async function readSheet({
  accessToken,
  spreadsheetId,
  tab,
}: {
  accessToken: string;
  spreadsheetId: string;
  tab: string;
}) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:Z`,
  });

  return res.data.values ?? [];
}