import type {
  EvidenceDrivenHypothesisSeed,
  SyncedEvidenceSnapshot,
} from "@/lib/intelligence/evidence-ingestion-contracts";

export async function getSyncedEvidenceSnapshot(
  projectId: string
): Promise<SyncedEvidenceSnapshot> {
  return {
    projectId,
    ga4: {
      status: "missing",
      rows: 0,
      note: "GA4 normalized evidence is not yet hydrated into the intelligence layer.",
    },
    gsc: {
      status: "missing",
      rows: 0,
      note: "GSC normalized evidence is not yet hydrated into the intelligence layer.",
    },
    behavior: {
      status: "missing",
      rows: 0,
      note: "Behavior normalized evidence is not yet hydrated into the intelligence layer.",
    },
  };
}

export async function buildEvidenceDrivenHypothesisSeeds(
  projectId: string
): Promise<EvidenceDrivenHypothesisSeed[]> {
  const snapshot = await getSyncedEvidenceSnapshot(projectId);

  const missingSources = [
    snapshot.ga4.status === "missing" ? "GA4" : null,
    snapshot.gsc.status === "missing" ? "GSC" : null,
    snapshot.behavior.status === "missing" ? "Behavior" : null,
  ].filter(Boolean) as string[];

  return [
    {
      id: "evidence-coverage-gate",
      title: "Coverage-constrained intelligence read",
      category: "overview",
      score: missingSources.length > 0 ? 78 : 40,
      summary:
        missingSources.length > 0
          ? `Interpretation quality is still constrained by incomplete source coverage across ${missingSources.join(", ")}.`
          : "Coverage gates are no longer the primary blocker, so interpretation can deepen.",
      evidence: [
        `GA4 rows: ${snapshot.ga4.rows}`,
        `GSC rows: ${snapshot.gsc.rows}`,
        `Behavior rows: ${snapshot.behavior.rows}`,
      ],
      actions: [
        "Hydrate normalized evidence into the intelligence layer.",
        "Refresh sync after reconnecting required sources.",
      ],
      nextStep:
        "Complete evidence hydration before increasing confidence in cross-source interpretation.",
    },
    {
      id: "cross-source-readiness",
      title: "Cross-source contradiction detection is not yet sharp",
      category: "cross_source",
      score: missingSources.length >= 2 ? 64 : 48,
      summary:
        missingSources.length >= 2
          ? "Contradiction detection cannot be trusted confidently because multiple evidence layers remain incomplete."
          : "Cross-source reasoning can begin, but confidence remains moderate until all layers are hydrated.",
      evidence: [
        snapshot.ga4.note,
        snapshot.gsc.note,
        snapshot.behavior.note,
      ],
      actions: [
        "Hydrate GA4, GSC, and behavior into the same reasoning spine.",
        "Only promote contradiction reads after source coverage improves.",
      ],
      nextStep:
        "Use synced, normalized evidence to compare source agreement before surfacing strong contradiction reads.",
    },
    {
      id: "execution-learning-readiness",
      title: "Execution learning evidence",
      category: "behavior",
      score: 36,
      summary:
        "Outcome history exists, but real evidence-backed interpretation is still held back by missing normalized source data.",
      evidence: [
        "Learning memory is active.",
        "Execution outcomes can now reinforce future ranking.",
      ],
      actions: [
        "Keep recording outcomes after execution.",
        "Combine outcome learning with real source evidence.",
      ],
      nextStep:
        "Raise evidence density before using outcome learning to promote stronger behavioral conclusions.",
    },
  ];
}