import fs from "node:fs";
import ts from "typescript";
import { effectScope } from "vue";

// Exercise the same composable used by the UI, without compiling Vue templates.
const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
const moduleURL = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
let source = fs.readFileSync(
  new URL("../../src/composables/usePlanner.ts", import.meta.url),
  "utf8",
);
source = source.replace(
  /import (\w+) from ["'](\.\.\/data\/[^"']+)["']/g,
  (_, name, path) =>
    `const ${name} = ${fs.readFileSync(new URL("../../src/" + path.slice(3), import.meta.url), "utf8")}`,
);
const handoffs = moduleURL(
  transpile(
    fs.readFileSync(
      new URL("../../src/lib/handoffs.ts", import.meta.url),
      "utf8",
    ),
  ),
);
source = source.replace(
  /["']\.\.\/lib\/handoffs["']/g,
  JSON.stringify(handoffs),
);
let js = transpile(source).replace(
  /from ["']vue["']/g,
  `from '${import.meta.resolve("vue")}'`,
);
const { usePlanner } = await import(moduleURL(js));

export const createPlanner = (year, storage = new Map()) => {
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const scope = effectScope();
  const state = scope.run(() => usePlanner(year));
  return { state, storage, stop: () => scope.stop() };
};
