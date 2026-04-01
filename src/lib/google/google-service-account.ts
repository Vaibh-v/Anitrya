import crypto from "node:crypto";

type GoogleServiceAccountConfig = {
  clientEmail: string;
  privateKey: string;
};

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getServiceAccountConfig(): GoogleServiceAccountConfig {
  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim() ?? "";
  const privateKeyRaw =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ?? "";

  if (!clientEmail || !privateKeyRaw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_NOT_CONFIGURED");
  }

  return {
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
  };
}

function createJwtAssertion(input: {
  clientEmail: string;
  privateKey: string;
  scope: string;
}): string {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: input.clientEmail,
    scope: input.scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();

  const signature = signer.sign(input.privateKey);

  return `${unsigned}.${base64UrlEncode(signature)}`;
}

export async function getGoogleServiceAccessToken(scope: string): Promise<string> {
  const config = getServiceAccountConfig();

  const assertion = createJwtAssertion({
    clientEmail: config.clientEmail,
    privateKey: config.privateKey,
    scope,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "GOOGLE_ACCESS_TOKEN_REQUEST_FAILED"
    );
  }

  return payload.access_token;
}