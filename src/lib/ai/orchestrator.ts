export type OrchestratorProvider = "gpt" | "claude" | "gemini" | "internal";

export type ModelOpinion = {
  provider: OrchestratorProvider;
  configured: boolean;
  role: "diagnostic" | "strategy" | "communication" | "adjudication";
  summary: string;
  confidence: "high" | "medium" | "low";
  supported: boolean;
};

export type OrchestrationInput = {
  workspaceSummary: {
    ga4UsersDelta: number | null;
    ga4SessionsDelta: number | null;
    ga4EngagementDelta: number | null;
    gscClicksDelta: number | null;
    gscImpressionsDelta: number | null;
    gscCtrDelta: number | null;
    gscPositionDelta: number | null;
  };
  crossSourceFindings: Array<{
    title: string;
    summary: string;
    confidence: "high" | "medium" | "low";
    evidence: string[];
    actions: string[];
  }>;
};

export type OrchestrationOutput = {
  executiveSummary: string;
  finalConfidence: "high" | "medium" | "low";
  providerStatus: ModelOpinion[];
  adjudicatedActions: string[];
};

function configured(name: "OPENAI_API_KEY" | "ANTHROPIC_API_KEY" | "GOOGLE_API_KEY") {
  return Boolean(process.env[name]);
}

function buildInternalDiagnostic(input: OrchestrationInput): ModelOpinion {
  const hasStrongCrossSourceSignal = input.crossSourceFindings.some(
    (f) => f.confidence === "high"
  );

  return {
    provider: "internal",
    configured: true,
    role: "adjudication",
    summary: hasStrongCrossSourceSignal
      ? "Strong cross-source evidence is present. Prioritize the highest-confidence finding first."
      : "Evidence is mixed or moderate. Validate acquisition, visibility, and engagement together before acting.",
    confidence: hasStrongCrossSourceSignal ? "high" : "medium",
    supported: true
  };
}

function buildPlaceholderOpinion(
  provider: OrchestratorProvider,
  role: ModelOpinion["role"],
  summary: string
): ModelOpinion {
  const envMap = {
    gpt: "OPENAI_API_KEY" as const,
    claude: "ANTHROPIC_API_KEY" as const,
    gemini: "GOOGLE_API_KEY" as const,
    internal: null
  };

  const isConfigured =
    provider === "internal" ? true : configured(envMap[provider]!);

  return {
    provider,
    configured: isConfigured,
    role,
    summary: isConfigured
      ? summary
      : `${provider.toUpperCase()} orchestration slot is defined but not yet wired with credentials.`,
    confidence: isConfigured ? "medium" : "low",
    supported: isConfigured
  };
}

export async function orchestrateIntelligence(
  input: OrchestrationInput
): Promise<OrchestrationOutput> {
  const providerStatus: ModelOpinion[] = [
    buildPlaceholderOpinion(
      "gpt",
      "diagnostic",
      "Use GPT as the diagnostic reasoner for pattern interpretation and causal hypothesis ranking."
    ),
    buildPlaceholderOpinion(
      "claude",
      "strategy",
      "Use Claude as the strategic planner for prioritizing next actions and sequencing investigations."
    ),
    buildPlaceholderOpinion(
      "gemini",
      "communication",
      "Use Gemini as the synthesis and presentation reasoner for concise, user-facing summaries."
    ),
    buildInternalDiagnostic(input)
  ];

  const topFinding = input.crossSourceFindings[0];

  const executiveSummary = topFinding
    ? topFinding.summary
    : "The system has synced data, but there is not yet enough strong cross-source evidence to issue a high-confidence conclusion.";

  const adjudicatedActions = topFinding
    ? topFinding.actions
    : [
        "Continue syncing data across sources.",
        "Validate coverage quality before drawing conclusions.",
        "Monitor the next 7-day window for stronger directional evidence."
      ];

  const finalConfidence =
    topFinding?.confidence ??
    providerStatus.find((p) => p.provider === "internal")?.confidence ??
    "low";

  return {
    executiveSummary,
    finalConfidence,
    providerStatus,
    adjudicatedActions
  };
}