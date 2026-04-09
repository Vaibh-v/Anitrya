import GoogleProvider from "next-auth/providers/google";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export const GOOGLE_ANALYTICS_SCOPE =
  "https://www.googleapis.com/auth/analytics.readonly";
export const GOOGLE_SEARCH_CONSOLE_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";
export const GOOGLE_SHEETS_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets";
export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
export const GOOGLE_BUSINESS_SCOPE =
  "https://www.googleapis.com/auth/business.manage";

export const GOOGLE_WORKSPACE_SCOPES = [
  "openid",
  "email",
  "profile",
  GOOGLE_ANALYTICS_SCOPE,
  GOOGLE_SEARCH_CONSOLE_SCOPE,
  GOOGLE_SHEETS_SCOPE,
  GOOGLE_ADS_SCOPE,
  GOOGLE_BUSINESS_SCOPE,
].join(" ");

export const authProviders = [
  GoogleProvider({
    id: "google",
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
    authorization: {
      params: {
        scope: GOOGLE_WORKSPACE_SCOPES,
        access_type: "offline",
        prompt: "consent",
        response_type: "code",
        include_granted_scopes: "true",
      },
    },
  }),
];