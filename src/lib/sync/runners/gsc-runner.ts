import { getWorkspaceGoogleAccessToken } from "@/lib/google/tokens";

export async function runGSCSync(input: {
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
  await getWorkspaceGoogleAccessToken(input.session, {
    acceptedProviders: ["GOOGLE_GSC"],
  });

  return {
    source: "google_gsc",
    status: "success" as const,
    rows: 0,
    message: `GSC runner executed for ${input.projectSlug} (${input.from} → ${input.to})`,
  };
}