/**
 * SEMrush readiness — the single place that decides whether SEMrush is
 * connected / mapped / storage-ready / syncable for a project, with
 * explainable blockers. Used by provider health and by the sync runner.
 */
import { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret, isEncryptedSecret } from "@/lib/security/crypto";
import type { SemrushDomainMapping } from "@/lib/integrations/semrush/semrush-evidence-contract";
import { getLatestSemrushDomainMapping } from "@/lib/integrations/semrush/semrush-mapping-ledger";
import { semrushEvidenceTableExists } from "@/lib/integrations/semrush/semrush-evidence-store";

export type SemrushKeyState = "missing" | "unencrypted" | "encrypted";

export type SemrushReadiness = {
  keyState: SemrushKeyState;
  connected: boolean;
  mapping: SemrushDomainMapping | null;
  mapped: boolean;
  storageReady: boolean;
  syncable: boolean;
  blockers: string[];
  nextAction: string;
};

async function readStoredSemrushKey(workspaceId: string): Promise<string | null> {
  const token = await prisma.integrationToken.findUnique({
    where: {
      workspaceId_provider: { workspaceId, provider: IntegrationProvider.SEMRUSH },
    },
    select: { apiKey: true },
  });

  const value = token?.apiKey?.trim();
  return value ? value : null;
}

function keyStateOf(stored: string | null): SemrushKeyState {
  if (!stored) return "missing";
  return isEncryptedSecret(stored) ? "encrypted" : "unencrypted";
}

export type SemrushApiKeyResolution =
  | { status: "ok"; apiKey: string }
  | { status: "missing" | "unencrypted" | "undecryptable"; reason: string };

/** Server-only: decrypt the workspace SEMrush key. Never returns plaintext-at-rest keys. */
export async function resolveSemrushApiKey(
  workspaceId: string,
): Promise<SemrushApiKeyResolution> {
  const stored = await readStoredSemrushKey(workspaceId);
  const state = keyStateOf(stored);

  if (state === "missing") {
    return {
      status: "missing",
      reason: "SEMrush API key is not connected for this workspace.",
    };
  }

  if (state === "unencrypted") {
    return {
      status: "unencrypted",
      reason: "Stored SEMrush API key is not encrypted. Reconnect SEMrush from Settings.",
    };
  }

  try {
    const apiKey = decryptSecret(stored as string).trim();
    if (!apiKey) throw new Error("empty");
    return { status: "ok", apiKey };
  } catch {
    return {
      status: "undecryptable",
      reason:
        "Stored SEMrush API key could not be decrypted (APP_SECRET/NEXTAUTH_SECRET may have changed). Reconnect SEMrush.",
    };
  }
}

export async function getSemrushReadiness(input: {
  workspaceId: string;
  projectSlug: string | null;
}): Promise<SemrushReadiness> {
  const [stored, mapping, storageReady] = await Promise.all([
    readStoredSemrushKey(input.workspaceId).catch(() => null),
    input.projectSlug
      ? getLatestSemrushDomainMapping({
          workspaceId: input.workspaceId,
          projectSlug: input.projectSlug,
        }).catch(() => null)
      : Promise.resolve(null),
    semrushEvidenceTableExists(),
  ]);

  const keyState = keyStateOf(stored);
  const connected = keyState === "encrypted";
  const mapped = Boolean(mapping);
  const syncable = connected && mapped && storageReady;
  const blockers: string[] = [];

  if (keyState === "missing") {
    blockers.push("SEMrush API key is not connected for this workspace.");
  }
  if (keyState === "unencrypted") {
    blockers.push("Stored SEMrush API key is not encrypted. Reconnect SEMrush from Settings.");
  }
  if (!input.projectSlug) {
    blockers.push("Select a project to evaluate SEMrush domain mapping.");
  } else if (!mapped) {
    blockers.push(
      "No SEMrush domain mapping saved for this project (POST /api/integrations/semrush/mapping).",
    );
  }
  if (!storageReady) {
    blockers.push(
      "semrush_evidence_snapshot table is missing. Apply the SEMrush migration (it is also created on the first successful SEMrush sync).",
    );
  }

  const nextAction = !connected
    ? "Connect a SEMrush API key from Settings."
    : !mapped
    ? "Save the project's SEMrush domain + database mapping."
    : !storageReady
    ? "Apply the semrush_evidence_snapshot migration, or run a SEMrush sync to create storage."
    : "Run sync to capture a SEMrush snapshot for this project.";

  return { keyState, connected, mapping, mapped, storageReady, syncable, blockers, nextAction };
}
