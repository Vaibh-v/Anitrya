export type SharedNavContext = {
  projectId: string;
  workspaceId?: string | null;
  preset?: string;
  from?: string;
  to?: string;
};

function buildQuery(context: SharedNavContext) {
  const params = new URLSearchParams();

  if (context.projectId) params.set("project", context.projectId);
  if (context.workspaceId) params.set("workspace", context.workspaceId);
  if (context.preset) params.set("preset", context.preset);
  if (context.from) params.set("from", context.from);
  if (context.to) params.set("to", context.to);

  return params.toString();
}

export function buildOverviewHref(context: SharedNavContext) {
  return `/home/overview?${buildQuery(context)}`;
}

export function buildSeoHref(context: SharedNavContext) {
  return `/home/seo?${buildQuery(context)}`;
}

export function buildBehaviorHref(context: SharedNavContext) {
  return `/home/behavior?${buildQuery(context)}`;
}

export function buildIntelligenceHref(context: SharedNavContext) {
  return `/home/intelligence?${buildQuery(context)}`;
}