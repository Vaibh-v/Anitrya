export type SelectedProjectResolution = {
  projectId: string;
  displayName: string;
  source: "query" | "workspace" | "fallback";
  hasProject: boolean;
};

type ResolveSelectedProjectInput = {
  requestedProjectId?: string | null;
  requestedProjectName?: string | null;
  sessionWorkspaceId?: string | null;
  fallbackProjectId?: string | null;
};

function normalize(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatDisplayName(projectId: string) {
  if (projectId.toLowerCase() === "zt") return "ZenTrades";
  if (projectId.toLowerCase() === "clara-ai") return "Clara AI";
  return projectId;
}

export function resolveSelectedProject(
  input: ResolveSelectedProjectInput
): SelectedProjectResolution {
  const requestedProjectId = normalize(input.requestedProjectId);
  const requestedProjectName = normalize(input.requestedProjectName);
  const sessionWorkspaceId = normalize(input.sessionWorkspaceId);
  const fallbackProjectId = normalize(input.fallbackProjectId) ?? "default-project";

  if (requestedProjectId) {
    return {
      projectId: requestedProjectId,
      displayName: requestedProjectName ?? formatDisplayName(requestedProjectId),
      source: "query",
      hasProject: true,
    };
  }

  if (sessionWorkspaceId) {
    return {
      projectId: sessionWorkspaceId,
      displayName: formatDisplayName(sessionWorkspaceId),
      source: "workspace",
      hasProject: true,
    };
  }

  return {
    projectId: fallbackProjectId,
    displayName: formatDisplayName(fallbackProjectId),
    source: "fallback",
    hasProject: false,
  };
}