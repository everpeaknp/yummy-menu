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
function loadComponentExports() {
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (name === 'react') return React;
    if (name === '@/services/api') return {};
    if (name === '@/lib/useDialog') return { useDialog: () => ({ current: null }) };
    return require(name);
  } });
  return exports;
}
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
test('bill loading failures distinguish an unreachable API from an HTTP response', () => {
  const exports = loadComponentExports();
  const getMessage = exports.customerBillErrorText;
  assert.equal(getMessage({ response: { data: { detail: 'Approval is still pending.' } } }), 'Approval is still pending.');
  assert.equal(getMessage({ response: { status: 410, data: { status: 'error', message: 'This table visit has ended. Ask restaurant staff for help.' } } }), 'This table visit has ended. Ask restaurant staff for help.');
  assert.match(getMessage({ response: { status: 500, statusText: 'Internal Server Error' } }), /HTTP 500/);
  assert.match(getMessage({ request: {}, code: 'ERR_NETWORK' }), /Could not reach the bill service/);
});
test('bill 410 refreshes table access from the server without locally invalidating it', () => {
  const component = fs.readFileSync(path.join(__dirname, '../src/components/CustomerBillManager.tsx'), 'utf8');
  assert.match(component, /shouldRefreshTableAccessAfterBillFailure\(error\)/);
  assert.match(component, /await onRefreshAccess\(\)/);
  assert.ok(!component.includes('onVisitEnded'));
  const helper = loadComponentExports();
  assert.equal(helper.shouldRefreshTableAccessAfterBillFailure({ response: { status: 410 } }), true);
  assert.equal(helper.shouldRefreshTableAccessAfterBillFailure({ response: { status: 500 } }), false);
});
test('bill access refresh callback stays stable so a 410 cannot restart the polling effect', () => {
  const cart = fs.readFileSync(path.join(__dirname, '../src/components/FloatingCart.tsx'), 'utf8');
  assert.match(cart, /const refreshBillAccess = useCallback\(\(\) => refreshSession\(true\), \[refreshSession\]\)/);
  assert.match(cart, /onRefreshAccess=\{refreshBillAccess\}/);
  assert.doesNotMatch(cart, /onRefreshAccess=\{\(\) => refreshSession\(true\)\}/);
  const manager = fs.readFileSync(path.join(__dirname, '../src/components/CustomerBillManager.tsx'), 'utf8');
  assert.match(manager, /!accessRefreshAttempted\.current\) void refresh\(\)/);
  assert.match(manager, /accessRefreshAttempted\.current = false; void refresh\(\)/);
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
