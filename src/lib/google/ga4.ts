import { google } from "googleapis";

function normalizeGa4PropertyId(propertyId: string): string {
  return propertyId.replace(/^properties\//, "").trim();
}

export async function gaListProperties(
  accessToken: string
): Promise<Array<{ id: string; name: string }>> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const admin = google.analyticsadmin({
    version: "v1beta",
    auth,
  });

  const response = await admin.accountSummaries.list();
  const output: Array<{ id: string; name: string }> = [];

  for (const account of response.data.accountSummaries ?? []) {
    for (const property of account.propertySummaries ?? []) {
      if (property.property && property.displayName) {
        output.push({
          id: normalizeGa4PropertyId(property.property),
          name: property.displayName,
        });
      }
    }
  }

  return output.sort((left, right) => left.name.localeCompare(right.name));
}

export async function gaRunReport(
  accessToken: string,
  propertyId: string,
  requestBody: Record<string, unknown>
) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const dataApi = google.analyticsdata({
    version: "v1beta",
    auth,
  });

  const normalizedPropertyId = normalizeGa4PropertyId(propertyId);

  const response = await dataApi.properties.runReport({
    property: `properties/${normalizedPropertyId}`,
    requestBody,
  });

  return response.data;
}