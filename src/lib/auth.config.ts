import GoogleProvider from "next-auth/providers/google";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export const LOGIN_SCOPES = "openid email profile";

export const GSC_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/webmasters.readonly"
].join(" ");

export const GA4_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/analytics.readonly"
].join(" ");

export const authProviders = [
  GoogleProvider({
    id: "google",
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
    authorization: {
      params: {
        scope: LOGIN_SCOPES,
        prompt: "select_account"
      }
    }
  }),
  GoogleProvider({
    id: "google-gsc",
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
    authorization: {
      params: {
        scope: GSC_SCOPES,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true"
      }
    }
  }),
  GoogleProvider({
    id: "google-ga4",
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
    authorization: {
      params: {
        scope: GA4_SCOPES,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true"
      }
    }
  })
];