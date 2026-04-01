import { SurfaceMetricCard } from "@/components/shared/SurfaceMetricCard";

type Props = {
  totalEntries: number;
  highConfidenceReads: number;
  trackedCategories: number;
  latestWrite: string;
};

export function IntelligenceMemoryStrip({
  totalEntries,
  highConfidenceReads,
  trackedCategories,
  latestWrite,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SurfaceMetricCard
        label="Memory entries"
        value={totalEntries}
        context="Persisted intelligence snapshots"
      />
      <SurfaceMetricCard
        label="High-confidence reads"
        value={highConfidenceReads}
        context="Stronger persisted reads"
      />
      <SurfaceMetricCard
        label="Tracked categories"
        value={trackedCategories}
        context="Overview, SEO, behavior, and cross-source"
      />
      <SurfaceMetricCard
        label="Latest memory write"
        value={latestWrite}
        context="Most recent persisted memory marker"
      />
    </div>
  );
}