export type ProjectSyncRequest = {
  project: string;
  from: string;
  to: string;
};

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (value.startsWith("0000-")) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseProjectSyncRequest(body: unknown): ProjectSyncRequest | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const input = body as Record<string, unknown>;
  const project = cleanString(input.project) ??
    cleanString(input.projectSlug) ??
    cleanString(input.projectId);
  const from = cleanString(input.from);
  const to = cleanString(input.to);

  if (!project || !from || !to || !validDate(from) || !validDate(to) || from > to) {
    return null;
  }

  return { project, from, to };
}
