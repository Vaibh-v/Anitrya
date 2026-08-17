import { getWorkspaceGoogleAccessToken } from "@/lib/google/tokens";

export async function runGA4Sync(input: {
  session: {
    user?: {
      workspaceId?: string | null;
    };
  };
  workspaceId: string;
  projectSlug: string;
  from: string;
  to: string;
}) {
  await getWorkspaceGoogleAccessToken(input.workspaceId);

  return {
    source: "google_ga4",
    status: "success" as const,
    rows: 0,
    message: `GA4 runner executed for ${input.projectSlug} (${input.from} → ${input.to})`,
  };
}
