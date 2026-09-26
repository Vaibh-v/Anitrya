// Kept dependency-free (no "@/" imports) so it stays unit-testable in isolation.
async function readGoogleJson<T>(response: Response, label: string): Promise<T> {
  const body = await response.text();
  try {
    return (body ? JSON.parse(body) : {}) as T;
  } catch {
    throw new Error(`${label} returned a non-JSON response (HTTP ${response.status}).`);
  }
}

export type AccessibleGoogleAdsCustomer = {
  customerId: string;
  displayName: string;
  loginCustomerId: string | null;
};

type AccessibleCustomersResponse = {
  resourceNames?: string[];
  error?: { message?: string };
};

type CustomerClient = {
  id?: string | number;
  descriptiveName?: string;
  descriptive_name?: string;
  manager?: boolean;
};

type CustomerClientChunk = {
  results?: Array<{
    customerClient?: CustomerClient;
    customer_client?: CustomerClient;
  }>;
  error?: { message?: string };
};

const ADS_API = "https://googleads.googleapis.com";

export async function listAccessibleGoogleAdsCustomers(input: {
  accessToken: string;
  developerToken: string;
  apiVersion: string;
  loginCustomerId: string | null;
}): Promise<{ customers: AccessibleGoogleAdsCustomer[]; warnings: string[] }> {
  const headers = {
    Authorization: `Bearer ${input.accessToken}`,
    "developer-token": input.developerToken,
  };
  const response = await fetch(
    `${ADS_API}/${input.apiVersion}/customers:listAccessibleCustomers`,
    { headers },
  );
  const payload = await readGoogleJson<AccessibleCustomersResponse>(
    response,
    "Google Ads account discovery",
  );

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `Google Ads account discovery failed (${response.status}).`,
    );
  }

  const customers = new Map<string, AccessibleGoogleAdsCustomer>();
  const warnings: string[] = [];
  const rootIds = (payload.resourceNames ?? [])
    .map((name) => /^customers\/(\d+)$/.exec(name)?.[1])
    .filter((id): id is string => Boolean(id));

  for (const rootId of rootIds) {
    if (!customers.has(rootId)) {
      customers.set(rootId, {
        customerId: rootId,
        displayName: rootId,
        loginCustomerId: input.loginCustomerId,
      });
    }

    const loginCustomerId = input.loginCustomerId ?? rootId;

    try {
      const hierarchyResponse = await fetch(
        `${ADS_API}/${input.apiVersion}/customers/${rootId}/googleAds:searchStream`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "login-customer-id": loginCustomerId,
          },
          body: JSON.stringify({
            query:
              "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.status FROM customer_client WHERE customer_client.status = 'ENABLED'",
          }),
        },
      );
      const chunks = await readGoogleJson<CustomerClientChunk[] | { error?: { message?: string } }>(
        hierarchyResponse,
        "Google Ads account hierarchy",
      );

      if (!hierarchyResponse.ok || !Array.isArray(chunks)) {
        const message = Array.isArray(chunks)
          ? chunks.find((chunk) => chunk.error?.message)?.error?.message
          : chunks.error?.message;
        throw new Error(message ?? `Account hierarchy unavailable (${hierarchyResponse.status}).`);
      }

      for (const chunk of chunks) {
        for (const row of chunk.results ?? []) {
          const client = row.customerClient ?? row.customer_client;
          const customerId = String(client?.id ?? "");
          if (!/^\d+$/.test(customerId)) continue;
          if (client?.manager) {
            if (customerId === rootId) customers.delete(rootId);
            continue;
          }
          if (customerId === rootId) continue;

          const existing = customers.get(customerId);
          customers.set(customerId, {
            customerId,
            displayName:
              client?.descriptiveName ?? client?.descriptive_name ?? existing?.displayName ?? customerId,
            loginCustomerId,
          });
        }
      }
    } catch (error) {
      warnings.push(
        `Could not list accounts beneath ${rootId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return { customers: [...customers.values()], warnings };
}
