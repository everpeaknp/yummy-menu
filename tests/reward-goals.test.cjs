const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/rewardGoals.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports });

test('ready rewards lead, followed by the goal closest to completion without changing source order', () => {
  const goals = [
    { completed: 2, required: 10, available_claims: 0 },
    { completed: 8, required: 10, available_claims: 0 },
    { completed: 3, required: 10, available_claims: 1 },
  ];
  const ranked = moduleExports.rankRewardGoals(goals);
  assert.deepEqual(Array.from(ranked, goal => goal.completed), [3, 8, 2]);
  assert.equal(goals[0].completed, 2);
  assert.equal(Array.from(moduleExports.rankRewardGoals([{ completed: 0, required: 0, available_claims: 0 }, goals[1]]), goal => goal.required).join(','), '10,0');
});
