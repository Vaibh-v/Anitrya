import { describe, expect, it } from "vitest";
import * as googleLib from "../src/lib/google";

describe("Frozen helper exports", () => {
  it("exports required helpers", () => {
    const required = [
      "getAccessToken",
      "gaListProperties",
      "gaRunReport",
      "gscListSites",
      "gscQueryKeywords",
      "gbpListLocations",
      "gbpFetchInsights",
      "ensureTabsExist",
      "appendRows",
      "gscQueryPageRows",
      "gaLandingPageRows",
      "gaSourceMediumRows",
    ];

    for (const name of required) {
      expect(Object.prototype.hasOwnProperty.call(googleLib, name)).toBe(true);
    }
  });
});