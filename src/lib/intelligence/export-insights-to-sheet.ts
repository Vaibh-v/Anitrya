import { google } from "googleapis";

type Insight = {
  type: string;
  title: string;
  description: string;
  confidence: number;
};

type Recommendation = {
  title: string;
  action: string;
};

export async function exportInsightsToSheet({
  project,
  insights,
  recommendations,
}: {
  project: any;
  insights: Insight[];
  recommendations: Recommendation[];
}) {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = process.env.OWNER_SPREADSHEET_ID!;

  const rows = insights.map((insight, index) => {
    const rec = recommendations[index];

    return [
      new Date().toISOString(),
      project.workspaceId,
      project.id,
      project.slug,
      insight.type,
      insight.title,
      insight.description,
      insight.confidence,
      rec?.action ?? "",
      "rule_based_provider",
    ];
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "insights!A:Z",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });
}