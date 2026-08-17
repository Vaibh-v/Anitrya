import { getWorkspaceGoogleAccessToken } from "@/lib/google/tokens";

export async function getValidWorkspaceGoogleAccessToken(input: {
  workspaceId: string;
}): Promise<string> {
  return getWorkspaceGoogleAccessToken(input.workspaceId);
}
