const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

const path = require('node:path').resolve(__dirname, '../src/lib/cart.ts');
const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = new Module(path);
loaded._compile(compiled, path);
const { addCartLine, changeLineNotes, changeLineQuantity, cartTotal, hasEndedTableSession, shouldEndTableSession } = loaded.exports;
const dish = { id: 1, name: 'Burger', price: 300, is_available: true };
const cheese = [{ modifier_id: 9, modifier_name_snapshot: 'Cheese', price_adjustment_snapshot: 50 }];

test('changing notes preserves identity and merges identical portions', () => {
  let lines = addCartLine([], dish, 'No onions', cheese, 52);
  lines = addCartLine(lines, dish, 'Extra spicy', cheese, 52);
  lines = changeLineNotes(lines, lines[0].lineId, 'Extra spicy');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].quantity, 2);
  lines = addCartLine(lines, dish, 'Extra spicy', cheese, 53);
  assert.equal(lines.length, 2);
});

test('customized versions can be changed independently', () => {
  let lines = addCartLine([], dish, 'No onions', cheese);
  lines = addCartLine(lines, dish, 'Extra spicy', []);
  lines = changeLineQuantity(lines, lines[0].lineId, 1);
  assert.deepEqual(lines.map(line => line.quantity), [2, 1]);
});

test('cart estimate includes modifier prices for every portion', () => {
  let lines = addCartLine([], dish, '', cheese);
  lines = addCartLine(lines, dish, '', cheese);
  assert.equal(cartTotal(lines), 700);
  assert.equal(lines.length, 1);
});

test('a temporary network failure does not end the table session', () => {
  assert.equal(shouldEndTableSession({ code: 'ERR_NETWORK' }), false);
  assert.equal(shouldEndTableSession({ response: { status: 503 } }), false);
  assert.equal(shouldEndTableSession({ response: { status: 401 } }), false);
  assert.equal(shouldEndTableSession({ response: { status: 404 } }), true);
  assert.equal(shouldEndTableSession({ response: { status: 410 } }), true);
});

test('a customer table session ends when its previous order is no longer active', () => {
  assert.equal(hasEndedTableSession(true, null), true);
  assert.equal(hasEndedTableSession(true, { active_orders: [], ordered_items: [] }), true);
  assert.equal(hasEndedTableSession(true, { active_orders: [{ id: 7 }], ordered_items: [] }), false);
  assert.equal(hasEndedTableSession(false, null), false);
});
