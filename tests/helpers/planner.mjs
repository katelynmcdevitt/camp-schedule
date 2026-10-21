import fs from "node:fs";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { effectScope } from "vue";

let source = fs.readFileSync(
  new URL("../../src/Planner.vue", import.meta.url),
  "utf8",
);
source = source.replace(
  /import (\w+) from ["'](\.\/data\/[^"']+)["']/g,
  (_, name, path) =>
    `const ${name} = ${fs.readFileSync(new URL("../../src/" + path.slice(2), import.meta.url), "utf8")}`,
);
const helper = ts.transpileModule(
  fs.readFileSync(
    new URL("../../src/lib/handoffs.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
source = source.replace(
  /["']\.\/lib\/handoffs["']/g,
  `'data:text/javascript;base64,${Buffer.from(helper).toString("base64")}'`,
);
const { descriptor } = parse(source);
const compiled = compileScript(descriptor, { id: "persistence-test" });
let js = ts.transpileModule(compiled.content, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
for (const dependency of ["vue", "lucide-vue-next"]) {
  js = js
    .replaceAll(
      `from "${dependency}"`,
      `from '${import.meta.resolve(dependency)}'`,
    )
    .replaceAll(
      `from '${dependency}'`,
      `from '${import.meta.resolve(dependency)}'`,
    );
}
const { default: Planner } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

export const createPlanner = (year, storage = new Map()) => {
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const scope = effectScope();
  const state = scope.run(() =>
    Planner.setup(
      { seasonYear: year, availableYears: [2026, 2027] },
      { expose: () => {}, emit: () => {} },
    ),
  );
  return { state, storage, stop: () => scope.stop() };
};
