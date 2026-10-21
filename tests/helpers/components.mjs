import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "typescript";
import { createRenderer, h } from "vue";

export const loadComponent = async (name) => {
  const filename = fileURLToPath(
    new URL(`../../src/components/${name}.vue`, import.meta.url),
  );
  const { descriptor } = parse(fs.readFileSync(filename, "utf8"), { filename });
  let js = ts.transpileModule(
    compileScript(descriptor, { id: name, inlineTemplate: true }).content,
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
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
  return (
    await import(
      `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
    )
  ).default;
};

// Minimal Vue host for testing component events without a browser or DOM library.
const node = (tag, text = "") => ({
  tag,
  text,
  children: [],
  props: {},
  parent: null,
});
const renderer = createRenderer({
  createElement: (tag) => node(tag),
  createText: (text) => node("text", text),
  createComment: (text) => node("comment", text),
  setText: (target, text) => {
    target.text = text;
  },
  setElementText: (target, text) => {
    target.text = text;
    target.children = [];
  },
  parentNode: (target) => target.parent,
  nextSibling: (target) =>
    target.parent?.children[target.parent.children.indexOf(target) + 1] ?? null,
  patchProp: (target, key, _previous, value) => {
    target.props[key] = value;
  },
  insert: (target, parent, anchor = null) => {
    if (target.parent)
      target.parent.children.splice(target.parent.children.indexOf(target), 1);
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(
      index < 0 ? parent.children.length : index,
      0,
      target,
    );
    target.parent = parent;
  },
  remove: (target) => {
    if (target.parent)
      target.parent.children.splice(target.parent.children.indexOf(target), 1);
    target.parent = null;
  },
});
export const mountComponent = (component, props) => {
  const root = node("root");
  const app = renderer.createApp({ render: () => h(component, props()) });
  app.mount(root);
  return { root, stop: () => app.unmount() };
};
export const findNodes = (root, predicate) => [
  ...(predicate(root) ? [root] : []),
  ...root.children.flatMap((child) => findNodes(child, predicate)),
];
export const textContent = (root) =>
  (root.tag === "comment" ? "" : root.text) +
  root.children.map(textContent).join("");
