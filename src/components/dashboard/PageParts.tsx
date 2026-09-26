import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeading(props: {
  overline: string;
  title: string;
  description: string;
  projectLabel: string;
  from: string;
  to: string;
}) {
  return (
    <section className="eye-heading">
      <div>
        <p className="eye-overline">{props.overline}</p>
        <h1>{props.title}</h1>
        <p>{props.description}</p>
      </div>
      <div className="eye-heading-project">
        <span>Active project</span>
        <strong>{props.projectLabel}</strong>
        <small className="eye-mono">{props.from} → {props.to}</small>
      </div>
    </section>
  );
}

export type Kpi = { label: string; value: string; note: string; accent?: "cyan" | "violet" | "green" | "amber" };

export function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div className="eye-kpis">
      {items.map((item) => (
        <article key={item.label} className="eye-panel eye-kpi">
          <h2>{item.label}</h2>
          <strong className="eye-mono">{item.value}</strong>
          <span>{item.note}</span>
          <span className={`eye-kpi-accent eye-spark-${item.accent ?? "cyan"}`} />
        </article>
      ))}
    </div>
  );
}

export type Column = { label: string; align?: "left" | "right" };

export function RankedTable(props: {
  title: string;
  tag?: string;
  columns: Column[];
  rows: Array<{ key: string; cells: ReactNode[]; bar?: number }>;
  empty: string;
}) {
  return (
    <article className="eye-panel">
      <h2>
        {props.title}
        {props.tag ? <span className="eye-tag">{props.tag}</span> : null}
      </h2>
      {props.rows.length === 0 ? (
        <p className="eye-panel-text">{props.empty}</p>
      ) : (
        <div className="eye-table-wrap">
          <table className="eye-table">
            <thead>
              <tr>
                {props.columns.map((column) => (
                  <th key={column.label} className={column.align === "right" ? "eye-num" : undefined}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row) => (
                <tr key={row.key}>
                  {row.cells.map((cell, index) => (
                    <td
                      key={index}
                      className={props.columns[index]?.align === "right" ? "eye-num eye-mono" : "eye-cell-label"}
                      style={index === 0 && row.bar != null ? ({ "--bar": `${Math.round(row.bar * 100)}%` } as React.CSSProperties) : undefined}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export function EmptyState(props: { title: string; body: string; href: string; action: string }) {
  return (
    <div className="eye-alert">
      <strong>{props.title}</strong>
      <span>{props.body}</span>
      <Link href={props.href}>{props.action} →</Link>
    </div>
  );
}

export function formatNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

export function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function resolveRange(params: { from?: string; to?: string; preset?: string }) {
  const today = new Date();
  const days = params.preset === "7d" ? 7 : params.preset === "90d" ? 90 : 30;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const valid = (v?: string) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  return {
    from: valid(params.from) ? (params.from as string) : iso(start),
    to: valid(params.to) ? (params.to as string) : iso(today),
  };
}
