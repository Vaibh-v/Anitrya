import { prisma } from "@/lib/prisma";
import { ensureNormalizedEvidenceTables } from "@/lib/evidence/ensure-normalized-evidence-tables";
import { GOOGLE_ADS_DEVELOPER_TOKEN_ENV } from "@/lib/integrations/google/ads/discovery-contract";

const DEFAULT_GOOGLE_ADS_API_VERSION = "v25";
const GOOGLE_ADS_API_BASE_URL = "https://googleads.googleapis.com";

type Input = {
  workspaceId: string;
  projectSlug: string;
  customerId: string;
  loginCustomerId: string | null;
  accessToken: string;
  from: string;
  to: string;
};

type GoogleAdsSearchStreamRow = {
  campaign?: {
    id?: string | number;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    advertising_channel_type?: string;
  };
  segments?: {
    date?: string;
  };
  metrics?: {
    impressions?: string | number;
    clicks?: string | number;
    costMicros?: string | number;
    cost_micros?: string | number;
    conversions?: string | number;
    ctr?: string | number;
    averageCpc?: string | number;
    average_cpc?: string | number;
  };
};

type GoogleAdsSearchStreamChunk = {
  results?: GoogleAdsSearchStreamRow[];
  error?: {
    message?: string;
  };
};

type GoogleAdsErrorPayload = {
  error?: {
    message?: string;
  };
};

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function numberValue(value: string | number | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integerValue(value: string | number | undefined): number {
  return Math.round(numberValue(value));
}

function microsValue(value: string | number | undefined): number {
  return Math.round(numberValue(value));
}

function normalizedCustomerId(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizedLoginCustomerId(value: string | null): string | null {
  return value?.replace(/\D/g, "") || null;
}

function apiVersion() {
  return process.env.GOOGLE_ADS_API_VERSION ?? DEFAULT_GOOGLE_ADS_API_VERSION;
}

function developerToken() {
  return process.env[GOOGLE_ADS_DEVELOPER_TOKEN_ENV] ?? null;
}

function campaignDailyQuery(input: { from: string; to: string }) {
  return `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date BETWEEN '${input.from}' AND '${input.to}'
    ORDER BY segments.date ASC, campaign.id ASC
  `;
}

export async function fetchGoogleAdsCampaignDaily(input: Input): Promise<number> {
  const token = developerToken();

  if (!token) {
    throw new Error(
      "GOOGLE_ADS_DEVELOPER_TOKEN is missing on the server, so Google Ads campaign sync cannot run.",
    );
  }

  const customerId = normalizedCustomerId(input.customerId);
  const loginCustomerId = normalizedLoginCustomerId(input.loginCustomerId);
  const response = await fetch(
    `${GOOGLE_ADS_API_BASE_URL}/${apiVersion()}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.accessToken}`,
        "developer-token": token,
        ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {}),
      },
      body: JSON.stringify({
        query: campaignDailyQuery({ from: input.from, to: input.to }),
      }),
    },
  );

  const payload = (await response.json()) as
    | GoogleAdsSearchStreamChunk[]
    | GoogleAdsErrorPayload;

  if (!response.ok) {
    const message = Array.isArray(payload)
      ? payload.find((chunk) => chunk.error?.message)?.error?.message
      : payload.error?.message;

    throw new Error(
      message ??
        `Google Ads campaign sync failed for customer ${customerId} with status ${response.status}.`,
    );
  }

  if (!Array.isArray(payload)) {
    throw new Error("Google Ads campaign sync returned an unexpected response.");
  }

  await ensureNormalizedEvidenceTables();

  const normalizedRows = payload
    .flatMap((chunk) => chunk.results ?? [])
    .map((row) => {
      const campaign = row.campaign;
      const metrics = row.metrics;
      const date = row.segments?.date;
      const campaignId = campaign?.id == null ? null : String(campaign.id);

      if (!date || !campaignId) return null;

      return `(
        '${escapeSql(input.workspaceId)}',
        '${escapeSql(input.projectSlug)}',
        DATE '${escapeSql(date)}',
        '${escapeSql(customerId)}',
        '${escapeSql(campaignId)}',
        '${escapeSql(campaign?.name ?? "")}',
        '${escapeSql(campaign?.status ?? "")}',
        '${escapeSql(campaign?.advertisingChannelType ?? campaign?.advertising_channel_type ?? "")}',
        ${integerValue(metrics?.impressions)},
        ${integerValue(metrics?.clicks)},
        ${microsValue(metrics?.costMicros ?? metrics?.cost_micros)},
        ${numberValue(metrics?.conversions)},
        ${numberValue(metrics?.ctr)},
        ${microsValue(metrics?.averageCpc ?? metrics?.average_cpc)}
      )`;
    })
    .filter((value): value is string => Boolean(value));

  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(`
      DELETE FROM google_ads_campaign_daily
      WHERE workspace_id = '${escapeSql(input.workspaceId)}'
        AND project_slug = '${escapeSql(input.projectSlug)}'
        AND customer_id = '${escapeSql(customerId)}'
        AND date >= DATE '${escapeSql(input.from)}'
        AND date <= DATE '${escapeSql(input.to)}'
    `);

    if (normalizedRows.length > 0) {
      await transaction.$executeRawUnsafe(`
      INSERT INTO google_ads_campaign_daily (
        workspace_id,
        project_slug,
        date,
        customer_id,
        campaign_id,
        campaign_name,
        campaign_status,
        channel_type,
        impressions,
        clicks,
        cost_micros,
        conversions,
        ctr,
        average_cpc_micros
      )
      VALUES ${normalizedRows.join(",\n")}
    `);
    }
  });

  return normalizedRows.length;
}
