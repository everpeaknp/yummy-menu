const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/CustomerBillManager.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const own = { id: 10, total: 100, items: [{ id: 8, name: 'Coke', qty: 2, total: 100, modifiers: [] }] };
const request = { id: 7, kind: 'merge', status: 'pending', incoming: true, from_name: 'Friend', to_name: 'Host', amount: 100,
  items: [{ name: 'Coke', qty: 2, modifiers: ['Ice'] }], expires_at: '2026-10-18T13:00:00Z' };
function render(data, states = {}) {
  const exports = {};
  let index = 0;
  vm.runInNewContext(source, { exports, require: name => {
    if (name === 'react') return { ...React, useEffect: () => {}, useState: initial => React.useState(index === 0 ? (index++, data) : states[index++] ?? initial) };
    if (name === '@/services/api') return {};
    if (name === '@/lib/useDialog') return { useDialog: () => ({ current: null }) };
    return require(name);
  } });
  return renderToStaticMarkup(React.createElement(exports.default, { qrToken: 'printed', onChanged: async () => {} }));
}
const data = { own_bill: own, is_host: false, blocked_reason: null, friends: [
  { account_id: 1, name: 'Host', is_host: true }, { account_id: 3, name: 'Other friend', is_host: false },
], requests: [] };
test('incoming charges are visible without opening Manage bill and explain financial consent', () => {
  const html = render({ ...data, requests: [request] });
  assert.match(html, /Friends need your approval/);
  assert.match(html, /Accept charges/);
  assert.match(html, /Accepting adds these charges to your bill/);
  assert.match(html, /host pays the combined bill/);
  assert.ok(!html.includes('role="dialog"'));
});
test('item assignment offers friends and bounded quantities in an accessible dialog', () => {
  const html = render(data, { 1: true });
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Other friend/);
  assert.match(html, /Assign quantity of Coke/);
  assert.match(html, /min="0" max="2"/);
  assert.match(html, /Request item assignment/);
});
test('whole-bill merge offers only the host and explicitly retains their billing ownership', () => {
  const html = render(data, { 1: true, 2: 'merge' });
  assert.ok(!html.includes('Other friend'));
  assert.match(html, /Send to the host/);
  assert.match(html, /host becomes the billing customer/);
  assert.match(html, /Only the host can pay/);
});
test('outgoing pending request offers cancel and blocks another proposal', () => {
  const html = render({ ...data, requests: [{ ...request, incoming: false }] }, { 1: true, 3: 1, 4: { 8: '1' } });
  assert.match(html, /already have a pending request/);
  assert.match(html, /Cancel request/);
  assert.match(html, /disabled=""[^>]*>Request item assignment/);
});
test('people without an accepted bill can receive charges but cannot create a proposal', () => {
  const html = render({ ...data, own_bill: null }, { 1: true });
  assert.match(html, /do not have an accepted bill yet/);
  assert.ok(!html.includes('Request item assignment'));
});
test('a blocked bill shows the backend reason and does not permit another proposal', () => {
  const html = render({ ...data, blocked_reason: 'Checkout already open' }, { 1: true, 3: 1, 4: { 8: '1' } });
  assert.match(html, /Checkout already open/);
  assert.match(html, /disabled=""[^>]*>Request item assignment/);
});
test('invalid fractional or negative quantities cannot be submitted', () => {
  for (const qty of ['-1','0.5','3']) {
    const html = render(data, { 1: true, 3: 1, 4: { 8: qty } });
    assert.match(html, /disabled=""[^>]*>Request item assignment/);
  }
});
test('a sender sees who pays after an accepted host merge', () => {
  const html = render({ ...data, own_bill: null, requests: [{ ...request, incoming: false, status: 'accepted' }] });
  assert.match(html, /host pays that combined bill/);
});
