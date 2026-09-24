import { NextRequest } from "next/server";
import { handleProjectProviderSync } from "@/lib/integrations/handle-project-provider-sync";

export async function POST(request: NextRequest) {
  return handleProjectProviderSync(request, "GOOGLE_GBP");
}
