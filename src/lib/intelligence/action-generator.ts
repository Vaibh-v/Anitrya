import type {
  IntelligenceAction,
  IntelligenceEvidencePoint,
  IntelligenceMissingData,
} from "@/lib/intelligence/intelligence-contracts";

export function buildIntelligenceActions(input: {
  evidence: IntelligenceEvidencePoint[];
  missingData: IntelligenceMissingData[];
}): IntelligenceAction[] {
  if (input.missingData.length > 0) {
    return [
      {
        title: "Complete evidence coverage",
        impact: "high",
        steps: [
          "Reconnect missing Google integrations where required.",
          "Run a full sync for the active project.",
          "Refresh the Intelligence tab after normalized evidence is updated.",
        ],
      },
      {
        title: "Validate project mapping",
        impact: "medium",
        steps: [
          "Confirm the selected project maps to the correct GA4 property.",
          "Confirm the selected project maps to the correct GSC site.",
          "Resolve any project-to-source mismatch before trusting conclusions.",
        ],
      },
    ];
  }

  return [
    {
      title: "Review highest-confidence finding",
      impact: "medium",
      steps: [
        "Inspect the top ranked diagnostic.",
        "Validate entity-level evidence behind it.",
        "Translate the finding into an owner-assigned recommendation.",
      ],
    },
  ];
}