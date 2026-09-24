import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(pathToFileURL(resolve("src", specifier.slice(2)) + ".ts").href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { prisma } = await import("../src/lib/prisma.ts");
const { resolveSelectedProject } = await import("../src/lib/projects/resolve-selected-project.ts");

test("an explicit unknown project never falls back to another workspace project", async () => {
  const originalFindMany = prisma.project.findMany;
  try {
    prisma.project.findMany = async ({ where }) => {
      assert.deepEqual(where, { workspaceId: "workspace-a" });
      return [{ id: "id-a", slug: "alpha", name: "Alpha", ga4PropertyId: null, gscSiteId: null }];
    };
    assert.equal(await resolveSelectedProject({ workspaceId: "workspace-a", projectSlug: "beta" }), null);
    assert.equal((await resolveSelectedProject({ workspaceId: "workspace-a", projectSlug: "alpha" }))?.slug, "alpha");
  } finally {
    prisma.project.findMany = originalFindMany;
  }
});
