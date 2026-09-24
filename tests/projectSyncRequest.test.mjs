import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProjectSyncRequest } from "../src/lib/integrations/project-sync-request.ts";

test("accepts a project and a valid inclusive date range", () => {
  assert.deepEqual(
    parseProjectSyncRequest({ projectSlug: "  my-project  ", from: "2024-02-29", to: "2024-02-29" }),
    { project: "my-project", from: "2024-02-29", to: "2024-02-29" },
  );
});

test("rejects malformed ranges before provider queries", () => {
  for (const body of [
    null,
    [],
    { project: "project", from: "2024-02-30", to: "2024-03-01" },
    { project: "project", from: "0000-01-01", to: "2024-03-01" },
    { project: "project", from: "2024-02-01' OR TRUE --", to: "2024-03-01" },
    { project: "project", from: "2024-03-02", to: "2024-03-01" },
    { project: 123, from: "2024-02-01", to: "2024-03-01" },
  ]) {
    assert.equal(parseProjectSyncRequest(body), null);
  }
});
