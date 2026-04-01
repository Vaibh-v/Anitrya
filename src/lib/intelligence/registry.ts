import type { ProjectDataBundle, SourceKey } from "@/lib/intelligence/contracts";

export type IntegrationAdapter = {
  key: SourceKey;
  isAvailable(bundle: ProjectDataBundle): boolean;
};

export const integrationRegistry: IntegrationAdapter[] = [
  {
    key: "ga4",
    isAvailable(bundle: ProjectDataBundle): boolean {
      return bundle.connections.some(
        (item) => item.source === "ga4" && item.connected
      );
    },
  },
  {
    key: "gsc",
    isAvailable(bundle: ProjectDataBundle): boolean {
      return bundle.connections.some(
        (item) => item.source === "gsc" && item.connected
      );
    },
  },
];