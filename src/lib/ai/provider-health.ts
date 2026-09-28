/**
 * AI provider health shared across server instances: who answered, who failed
 * and who is sitting out. Read once per question; written after each answer.
 */
import { prisma } from "@/lib/prisma";
import { ensureAdditiveSchema } from "@/lib/db/ensure-additive-schema";

export async function benchedProviders(): Promise<Set<string>> {
  await ensureAdditiveSchema();
  const rows = await prisma
    .$queryRawUnsafe<Array<{ provider: string }>>(`SELECT provider FROM ai_provider_health WHERE benched_until > CURRENT_TIMESTAMP`)
    .catch(() => []);
  return new Set(rows.map((r) => r.provider));
}

export async function recordProviderResults(results: Array<{ id: string; ok: boolean; error?: string; ms: number; benchMinutes: number }>) {
  for (const r of results) {
    await prisma
      .$executeRawUnsafe(
        `INSERT INTO ai_provider_health (provider, ok, error, ms, benched_until, checked_at)
         VALUES ($1, $2, $3, $4, CASE WHEN $5::int > 0 THEN CURRENT_TIMESTAMP + ($5::int * INTERVAL '1 minute') ELSE NULL END, CURRENT_TIMESTAMP)
         ON CONFLICT (provider) DO UPDATE SET ok = EXCLUDED.ok, error = EXCLUDED.error, ms = EXCLUDED.ms,
           benched_until = EXCLUDED.benched_until, checked_at = EXCLUDED.checked_at`,
        r.id,
        r.ok,
        r.error?.slice(0, 300) ?? null,
        r.ms,
        r.benchMinutes,
      )
      .catch(() => undefined);
  }
}

export async function providerHealth() {
  await ensureAdditiveSchema();
  return prisma
    .$queryRawUnsafe<Array<{ provider: string; ok: boolean; error: string | null; ms: number | null; benched_until: Date | null; checked_at: Date }>>(
      `SELECT provider, ok, error, ms, benched_until, checked_at FROM ai_provider_health ORDER BY provider`,
    )
    .catch(() => []);
}
