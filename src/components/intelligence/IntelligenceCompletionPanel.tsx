"use client";

import { SectionUnlockPanel } from "@/components/shared/SectionUnlockPanel";

export function IntelligenceCompletionPanel() {
  return (
    <SectionUnlockPanel
      title="What unlocks stronger intelligence"
      description="The intelligence layer is structurally complete, but stronger ranking and contradiction detection depend on deeper normalized evidence coverage."
      unlocks={[
        "Hydrate normalized GA4 source and landing evidence into ranked interpretation.",
        "Hydrate normalized GSC query and page evidence into ranked interpretation.",
        "Promote contradiction detection only after SEO, behavior, and overview evidence are all materially available.",
      ]}
    />
  );
}