import { generateHypotheses } from "./hypothesis-engine";

type Recommendation = {
  title: string;
  steps: string[];
  impact: "high" | "medium" | "low";
};

export async function generateRecommendations(projectId: string): Promise<Recommendation[]> {
  const hypotheses = await generateHypotheses(projectId);

  if (hypotheses[0]?.id === "no_data") {
    return [
      {
        title: "Connect data sources",
        steps: [
          "Connect GA4",
          "Connect GSC",
          "Run initial sync",
        ],
        impact: "high",
      },
    ];
  }

  return [
    {
      title: "Improve top landing pages",
      steps: [
        "Identify top pages",
        "Optimize content",
        "Improve CTA",
      ],
      impact: "medium",
    },
  ];
}