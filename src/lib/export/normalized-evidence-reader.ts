/**
 * Server-side, column-tolerant reader for normalized evidence tables.
 *
 * - Missing table  -> { status: "missing_table", rows: [] } (never throws)
 * - Missing column -> exported as "" instead of failing the query
 * - `date` may be DATE (Prisma migrations) or TEXT (older ensure-table SQL);
 *   the filter adapts to the real column type.
 */
import { prisma } from "@/lib/prisma";
import type { EvidenceTableSpec } from "@/lib/export/normalized-evidence-specs";

export type EvidenceTableRead = {
  spec: EvidenceTableSpec;
  status: "ok" | "missing_table" | "error";
  rows: Array<Record<string, unknown>>;
  truncated: boolean;
  error?: string;
};

type ColumnInfo = { column_name: string; data_type: string };

async function readColumns(table: string): Promise<ColumnInfo[]> {
  return prisma.$queryRaw<ColumnInfo[]>`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
}

function quoteIdent(name: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe identifier: ${name}`);
  }
  return `"${name}"`;
}

export async function readEvidenceTable(input: {
  spec: EvidenceTableSpec;
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
  limit: number;
}): Promise<EvidenceTableRead> {
  const { spec } = input;

  try {
    const columns = await readColumns(spec.table);
    if (columns.length === 0) {
      return { spec, status: "missing_table", rows: [], truncated: false };
    }

    const available = new Map(columns.map((c) => [c.column_name, c.data_type]));
    if (!available.has("workspace_id") || !available.has("project_slug")) {
      return {
        spec,
        status: "error",
        rows: [],
        truncated: false,
        error: `${spec.table} is not project-scoped (missing workspace_id/project_slug).`,
      };
    }

    const selected = spec.columns.filter((column) => available.has(column));
    if (selected.length === 0) {
      return { spec, status: "ok", rows: [], truncated: false };
    }

    const where = [`"workspace_id" = $1`, `"project_slug" = $2`];
    const params: unknown[] = [input.workspaceId, input.projectSlug];

    const dateType = available.get("date");
    if (dateType) {
      const isDate = dateType === "date" || dateType.startsWith("timestamp");
      where.push(
        isDate
          ? `"date" >= CAST($3 AS DATE) AND "date" <= CAST($4 AS DATE)`
          : `CAST("date" AS TEXT) >= $3 AND CAST("date" AS TEXT) <= $4`,
      );
      params.push(input.from, input.to);
    }

    const orderBy = spec.orderBy.filter((column) => available.has(column));
    const selectSql = selected
      .map((column) =>
        column === "date" && dateType && dateType !== "text"
          ? `CAST("date" AS TEXT) AS "date"`
          : quoteIdent(column),
      )
      .join(", ");

    const sql = `
      SELECT ${selectSql}
      FROM ${quoteIdent(spec.table)}
      WHERE ${where.join(" AND ")}
      ${orderBy.length ? `ORDER BY ${orderBy.map(quoteIdent).join(", ")}` : ""}
      LIMIT ${Math.max(1, Math.floor(input.limit)) + 1}
    `;

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(sql, ...params);
    const truncated = rows.length > input.limit;

    return {
      spec,
      status: "ok",
      rows: truncated ? rows.slice(0, input.limit) : rows,
      truncated,
    };
  } catch (error) {
    return {
      spec,
      status: "error",
      rows: [],
      truncated: false,
      error: error instanceof Error ? error.message : "Evidence read failed.",
    };
  }
}
