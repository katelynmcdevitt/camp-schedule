import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'
import { effectScope } from 'vue'

const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value)
}
let source = fs.readFileSync(new URL('../src/Planner.vue', import.meta.url), 'utf8')
source = source.replace(/import (\w+) from '(\.\/data\/[^']+)'/g, (_, name, path) =>
  `const ${name} = ${fs.readFileSync(new URL('../src/' + path.slice(2), import.meta.url), 'utf8')}`)
const helper = ts.transpileModule(fs.readFileSync(new URL('../src/lib/handoffs.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
source = source.replace("'./lib/handoffs'", `'data:text/javascript;base64,${Buffer.from(helper).toString('base64')}'`)
const { descriptor } = parse(source)
const compiled = compileScript(descriptor, { id: 'persistence-test' })
let js = ts.transpileModule(compiled.content, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
for (const dependency of ['vue', 'lucide-vue-next']) {
  js = js.replaceAll(`from "${dependency}"`, `from '${import.meta.resolve(dependency)}'`).replaceAll(`from '${dependency}'`, `from '${import.meta.resolve(dependency)}'`)
}
const { default: Planner } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const mount = year => {
  const scope = effectScope()
  const state = scope.run(() => Planner.setup({seasonYear: year, availableYears: [2026, 2027]}, {expose: () => {}, emit: () => {}}))
  return { state, stop: () => scope.stop() }
}
let plan = mount(2026)
assert.equal(plan.state.camps.value.length, 22)
plan.state.camps.value[0].paid = false
plan.state.handoffBuffer.value = 45
plan.state.kids.value[0] = 'Owen edited'
plan.state.camps.value = plan.state.camps.value.filter(c => c.id !== 'owen-2026-week-2')
const original2026 = storage.get('camp-days-2026')
plan.stop()
plan = mount(2027)
assert.equal(plan.state.camps.value.length, 0)
assert.equal(plan.state.selectedWeek.value, '2027-06-14')
assert.equal(plan.state.form.value.start, '2027-06-14')
assert.equal(plan.state.form.value.end, '2027-06-18')
plan.state.form.value = {...plan.state.form.value, name: '2027 camp', cost: 200}
plan.state.save()
assert.equal(plan.state.camps.value.length, 1)
assert.equal(plan.state.camps.value[0].paid, false)
assert.equal(storage.get('camp-days-2026'), original2026)
plan.stop()
plan = mount(2026)
assert.equal(plan.state.camps.value.length, 21)
assert.equal(plan.state.camps.value[0].paid, false)
assert.equal(plan.state.kids.value[0], 'Owen edited')
assert.equal(plan.state.handoffBuffer.value, 45)
plan.stop()
plan = mount(2027)
assert.equal(plan.state.camps.value[0].name, '2027 camp')
plan.state.camps.value = []
plan.stop()
plan = mount(2027)
assert.equal(plan.state.camps.value.length, 0)
plan.stop()
console.log('Persistence checks pass: isolated seasons, edits, deletions, payment changes, settings, empty plans, and 2027 defaults.')
