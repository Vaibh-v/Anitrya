import assert from "node:assert/strict";
import { test } from "node:test";
import { listAccessibleGoogleAdsCustomers } from "../src/lib/integrations/google/ads/accessible-customers.ts";

const input = {
  accessToken: "access-token",
  developerToken: "developer-token",
  apiVersion: "v25",
  loginCustomerId: null,
};

test("discovers leaf customers under a manager with the correct login account", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];

  try {
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith("customers:listAccessibleCustomers")) {
        return Response.json({ resourceNames: ["customers/123"] });
      }

      return Response.json([
        {
          results: [
            { customerClient: { id: "123", descriptiveName: "Manager", manager: true } },
            { customerClient: { id: "456", descriptiveName: "Client", manager: false } },
            { customerClient: { id: "789", descriptiveName: "Submanager", manager: true } },
          ],
        },
      ]);
    };

    const result = await listAccessibleGoogleAdsCustomers(input);
    assert.deepEqual(result, {
      customers: [{ customerId: "456", displayName: "Client", loginCustomerId: "123" }],
      warnings: [],
    });
    assert.equal(requests[0].options.headers["developer-token"], "developer-token");
    assert.equal(requests[1].options.headers["login-customer-id"], "123");
    assert.match(JSON.parse(requests[1].options.body).query, /customer_client\.manager/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps directly accessible customers when hierarchy lookup fails", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (url) =>
      url.endsWith("customers:listAccessibleCustomers")
        ? Response.json({ resourceNames: ["customers/123"] })
        : Response.json({ error: { message: "No hierarchy permission" } }, { status: 403 });

    const result = await listAccessibleGoogleAdsCustomers(input);
    assert.equal(result.customers[0].customerId, "123");
    assert.match(result.warnings[0], /No hierarchy permission/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fails discovery rather than reporting empty accounts when access is denied", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      Response.json({ error: { message: "Access denied" } }, { status: 403 });

    await assert.rejects(listAccessibleGoogleAdsCustomers(input), /Access denied/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
