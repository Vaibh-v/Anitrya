// Lets node:test import app TypeScript that uses "@/..." and extensionless
// relative imports (Node >= 22.18 strips types natively).
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = null;
    if (specifier.startsWith("@/")) {
      target = resolve("src", specifier.slice(2));
    } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.endsWith(".ts")) {
      target = resolve(dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (target && !/\.[cm]?[jt]s$/.test(target) && existsSync(`${target}.ts`)) {
      return nextResolve(pathToFileURL(`${target}.ts`).href, context);
    }
    return nextResolve(specifier, context);
  },
});
