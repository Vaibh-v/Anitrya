import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        pathToFileURL(resolve("src", specifier.slice(2)) + ".ts").href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});

const { prisma } = await import("../src/lib/prisma.ts");
const { discoverGoogleAdsAccounts } = await import("../src/lib/integrations/google/ads/discover-accounts.ts");
const { discoverGoogleBusinessProfileLocations } = await import("../src/lib/integrations/google/gbp/discover-locations.ts");
const { recordGoogleAdsAccountMapping } = await import("../src/lib/integrations/google/ads/account-mapping-ledger.ts");
const { recordGbpLocationMapping } = await import("../src/lib/integrations/google/gbp/location-mapping-ledger.ts");
const { googleAdsSyncRunner } = await import("../src/lib/integrations/connectors/google-ads-sync.ts");
const { googleGbpSyncRunner } = await import("../src/lib/integrations/connectors/google-gbp-sync.ts");

const context = {
  workspaceId: "workspace-1",
  mapping: { projectSlug: "project-1", projectLabel: "Project One" },
  from: "2026-09-01",
  to: "2026-09-02",
};

test("discovers, maps, and syncs Google Ads and GBP without losing rows on API errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalDeveloperToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const originalTokenLookup = prisma.integrationToken.findMany;
  const originalTokenUpdate = prisma.integrationToken.update;
  const originalRunCreate = prisma.syncRun.create;
  const originalRunLookup = prisma.syncRun.findFirst;
  const originalExecute = prisma.$executeRawUnsafe;
  const originalTransaction = prisma.$transaction;
  const runs = [];
  const requests = [];
  const transactions = [];
  const tableStatements = [];

  try {
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "synthetic-developer-token";
    prisma.integrationToken.findMany = async () => [{
      id: "token-1",
      workspaceId: context.workspaceId,
      provider: "GOOGLE_GA4",
      accessToken: "synthetic-access-token",
      refreshToken: null,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      scope: "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/business.manage",
      updatedAt: new Date(),
      createdAt: new Date(),
    }];
    prisma.integrationToken.update = async ({ data }) => data;
    prisma.syncRun.create = async ({ data }) => {
      runs.push(data);
      return data;
    };
    prisma.syncRun.findFirst = async ({ where }) => {
      const run = runs.findLast((candidate) =>
        candidate.source === where.source &&
        candidate.workspaceId === where.workspaceId &&
        where.AND.every(({ metadata }) =>
          candidate.metadata[metadata.path[0]] === metadata.equals,
        ),
      );
      return run ? { metadata: run.metadata } : null;
    };
    prisma.$executeRawUnsafe = async (sql) => {
      tableStatements.push(sql);
      return 0;
    };
    prisma.$transaction = async (callback) => {
      const statements = [];
      const result = await callback({
        $executeRawUnsafe: async (sql) => {
          statements.push(sql);
          return 1;
        },
      });
      transactions.push(statements);
      return result;
    };
    globalThis.fetch = async (url, options = {}) => {
      const requestUrl = String(url);
      requests.push({ url: requestUrl, options });

      if (requestUrl.endsWith("customers:listAccessibleCustomers")) {
        return Response.json({ resourceNames: ["customers/123"] });
      }
      if (requestUrl.includes("googleAds:searchStream")) {
        const query = JSON.parse(options.body).query;
        return query.includes("FROM customer_client")
          ? Response.json([{ results: [
              { customerClient: { id: "123", manager: true } },
              { customerClient: { id: "456", descriptiveName: "Client", manager: false } },
            ] }])
          : Response.json([{ results: [{
              campaign: { id: "99", name: "O'Brien campaign", status: "ENABLED" },
              segments: { date: "2026-09-01" },
              metrics: { impressions: "10", clicks: "2", costMicros: "2500000" },
            }] }]);
      }
      if (requestUrl.includes("mybusinessaccountmanagement.googleapis.com")) {
        return Response.json({ accounts: [{ name: "accounts/12", accountName: "Business" }] });
      }
      if (requestUrl.includes("mybusinessbusinessinformation.googleapis.com")) {
        return Response.json({ locations: [{ name: "locations/789", title: "Store" }] });
      }
      if (requestUrl.includes("businessprofileperformance.googleapis.com")) {
        return Response.json({ multiDailyMetricTimeSeries: [{
          dailyMetricTimeSeries: [{
            dailyMetric: "CALL_CLICKS",
            timeSeries: { datedValues: [{ date: { year: 2026, month: 9, day: 1 }, value: "3" }] },
          }],
        }] });
      }
      throw new Error(`Unexpected fixture request: ${requestUrl}`);
    };

    const adsDiscovery = await discoverGoogleAdsAccounts({ workspaceId: context.workspaceId });
    assert.equal(adsDiscovery.status, "ready");
    assert.equal(adsDiscovery.assets[0].metadata.customerId, "456");
    await recordGoogleAdsAccountMapping({
      workspaceId: context.workspaceId,
      projectSlug: context.mapping.projectSlug,
      projectLabel: context.mapping.projectLabel,
      asset: adsDiscovery.assets[0],
    });

    const gbpDiscovery = await discoverGoogleBusinessProfileLocations({ workspaceId: context.workspaceId });
    assert.equal(gbpDiscovery.status, "ready");
    assert.equal(gbpDiscovery.assets[0].sourceId, "locations/789");
    await recordGbpLocationMapping({
      workspaceId: context.workspaceId,
      projectSlug: context.mapping.projectSlug,
      projectLabel: context.mapping.projectLabel,
      asset: gbpDiscovery.assets[0],
    });

    const adsResult = await googleAdsSyncRunner.sync(context);
    const gbpResult = await googleGbpSyncRunner.sync(context);
    assert.equal(adsResult.status, "success");
    assert.equal(gbpResult.status, "success");
    assert.equal(adsResult.rowsSynced, 1);
    assert.equal(gbpResult.rowsSynced, 1);
    assert.equal(transactions.length, 2);
    assert.equal(transactions[0].length, 2);
    assert.equal(transactions[1].length, 2);
    assert.match(transactions[0][0], /DELETE FROM google_ads_campaign_daily/);
    assert.match(transactions[0][1], /O''Brien campaign/);
    assert.match(transactions[1][0], /DELETE FROM gbp_location_daily/);
    assert.match(transactions[1][1], /CALL_CLICKS/);
    assert.ok(tableStatements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS google_ads_campaign_daily")));
    assert.ok(tableStatements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS gbp_location_daily")));

    const adsRequest = requests.find((request) => request.url.includes("customers/456/googleAds:searchStream"));
    assert.equal(adsRequest.options.headers["developer-token"], "synthetic-developer-token");
    assert.equal(adsRequest.options.headers["login-customer-id"], "123");
    const gbpRequest = requests.find((request) => request.url.includes("fetchMultiDailyMetricsTimeSeries"));
    assert.equal(new URL(gbpRequest.url).searchParams.get("dailyRange.start_date.year"), "2026");

    globalThis.fetch = async () => Response.json({ error: { message: "Permission denied" } }, { status: 403 });
    await assert.rejects(googleAdsSyncRunner.sync(context), /Permission denied/);
    await assert.rejects(googleGbpSyncRunner.sync(context), /Permission denied/);
    assert.equal(transactions.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalDeveloperToken === undefined) delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    else process.env.GOOGLE_ADS_DEVELOPER_TOKEN = originalDeveloperToken;
    prisma.integrationToken.findMany = originalTokenLookup;
    prisma.integrationToken.update = originalTokenUpdate;
    prisma.syncRun.create = originalRunCreate;
    prisma.syncRun.findFirst = originalRunLookup;
    prisma.$executeRawUnsafe = originalExecute;
    prisma.$transaction = originalTransaction;
    await prisma.$disconnect();
  }
});
