const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/location.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function setup() {
  let success, failure, expire, options;
  const cleared = [];
  const exports = {};
  vm.runInNewContext(source, { exports, navigator: { geolocation: {
    watchPosition: (s, f, o) => { success = s; failure = f; options = o; return 7; },
    clearWatch: id => cleared.push(id),
  } }, setTimeout: fn => { expire = fn; return 1; }, clearTimeout: () => {} });
  const promise = exports.getTableActionLocation();
  return { promise, cleared, options, reading: accuracy => success({ coords: { latitude: 28, longitude: 84, accuracy } }),
    fail: code => failure({ code, PERMISSION_DENIED: 1 }), expire: () => expire() };
}

test('waits for a better fresh reading and cleans up after success', async () => {
  const s = setup();
  assert.equal(s.options.maximumAge, 0);
  assert.equal(s.options.enableHighAccuracy, true);
  s.reading(900);
  assert.deepEqual(s.cleared, []);
  s.reading(45);
  assert.equal((await s.promise).accuracy_meters, 45);
  assert.deepEqual(s.cleared, [7]);
});

test('deadline returns best actual reading for server validation, not invented precision', async () => {
  const s = setup();
  s.reading(900); s.reading(350); s.reading(800); s.expire();
  assert.equal((await s.promise).accuracy_meters, 350);
  assert.deepEqual(s.cleared, [7]);
});

test('permission denial cleans up with actionable draft-safe error', async () => {
  const s = setup(); s.fail(1);
  await assert.rejects(s.promise, /Location access is blocked.*draft is saved/);
  assert.deepEqual(s.cleared, [7]);
});

test('transient failure can recover; no reading at deadline rejects and cleans up', async () => {
  const s = setup(); s.fail(2); s.reading(30);
  assert.equal((await s.promise).accuracy_meters, 30);
  const empty = setup(); empty.reading(NaN); empty.expire();
  await assert.rejects(empty.promise, /Could not get your location/);
  assert.deepEqual(empty.cleared, [7]);
});
