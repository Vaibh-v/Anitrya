/**
 * Evidence tables were created two ways: migrations (date DATE) and older
 * ensure-table SQL (date TEXT). Comparing CAST(date AS TEXT) works for both but
 * defeats the (workspace, project, date) index. This resolves each table's real
 * column type once per server instance and returns an index-friendly range.
 */
import { prisma } from "@/lib/prisma";

type Kind = "date" | "text";
let kinds: Promise<Record<string, Kind>> | null = null;

function loadKinds(): Promise<Record<string, Kind>> {
  if (!kinds) {
    kinds = prisma
      .$queryRawUnsafe<Array<{ table_name: string; data_type: string }>>(
        `SELECT table_name, data_type FROM information_schema.columns
         WHERE column_name = 'date' AND table_schema = current_schema()`,
      )
      .then((rows) => Object.fromEntries(rows.map((r) => [r.table_name, r.data_type === "date" ? "date" : "text"] as const)))
      .catch((error) => {
        kinds = null;
        console.warn("DATE_KIND_LOOKUP_FAILED", error instanceof Error ? error.message : error);
        return {};
      });
  }
  return kinds;
}

/** `date` between two positional params, using the index when the column is DATE. */
export async function dateRange(table: string, fromParam: number, toParam: number): Promise<string> {
  const kind = (await loadKinds())[table];
  if (kind === "date") return `date >= $${fromParam}::date AND date <= $${toParam}::date`;
  if (kind === "text") return `date >= $${fromParam}::text AND date <= $${toParam}::text`;
  return `CAST(date AS TEXT) >= $${fromParam} AND CAST(date AS TEXT) <= $${toParam}`;
}
