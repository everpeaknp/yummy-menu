const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/CustomerFonepayCheckout.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
test('customer checkout hides internal Fonepay plan details', () => {
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (name === '@/services/api') return {};
    if (name === '@/lib/useDialog') return { useDialog: () => ({ current: null }) };
    return require(name);
  } });
  assert.equal(
    exports.customerFonepayErrorMessage(
      { response: { data: { detail: 'This plan does not include Fonepay integration.' } } },
      'Could not start Fonepay checkout.',
    ),
    'Online payment is not available at this restaurant. Please ask the restaurant for help.',
  );
});
function harness({ cancel, verify } = {}) {
  const checkout = { prn: 'saved', order_id: 1, status: 'pending', amount: 100, restaurant_name: 'Yummy', table_name: 'g' };
  const states = [checkout, 'qr-image', '', false, false, false, false];
  const refs = [];
  let stateIndex, refIndex, hidden = 0, cancelled = 0, calls = 0;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (name === 'react') return { ...React, useEffect() {}, useCallback: fn => fn,
      useState: initial => { const index = stateIndex++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
      useRef: initial => { const index = refIndex++; return refs[index] ||= { current: initial === '' ? 'printed' : initial }; },
    };
    if (name === '@/services/api') return {
      cancelCustomerFonepayCheckout: async (...args) => { calls++; return cancel ? cancel(...args) : { status: 'cancelled' }; },
      verifyCustomerFonepayCheckout: verify || (async () => ({ status: 'pending', amount: 100 })),
    };
    if (name === '@/lib/useDialog') return { useDialog: () => ({ current: null }) };
    return require(name);
  } });
  const render = () => { stateIndex = 0; refIndex = 0; return exports.default({ open: true, qrToken: 'printed', onClose: () => hidden++, onPaid: async () => {}, onCancelled: async () => cancelled++ }); };
  function nodes(node) { return !node || typeof node !== 'object' ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)]; }
  const button = label => nodes(render()).find(node => node.type === 'button' && (node.props['aria-label'] === label || React.Children.toArray(node.props.children).includes(label)));
  return { states, button, get hidden() { return hidden; }, get calls() { return calls; }, get cancelled() { return cancelled; } };
}
test('X hides checkout without cancelling it', () => {
  const view = harness();
  view.button('Hide Fonepay checkout').props.onClick();
  assert.equal(view.hidden, 1);
  assert.equal(view.calls, 0);
  assert.equal(view.states[0].status, 'pending');
});
test('cancel requires confirmation; keeping checkout does not call the API', () => {
  const view = harness();
  view.button('Cancel payment checkout').props.onClick();
  assert.ok(view.button('Yes, cancel checkout'));
  view.button('Keep checkout').props.onClick();
  assert.equal(view.calls, 0);
  assert.equal(view.states[0].status, 'pending');
});
test('explicit cancel invalidates the QR and refreshes bill options without cancelling food', async () => {
  const view = harness({ cancel: async (prn, token) => { assert.equal(prn, 'saved'); assert.equal(token, 'printed'); return { status: 'cancelled' }; } });
  view.button('Cancel payment checkout').props.onClick();
  view.button('Yes, cancel checkout').props.onClick();
  await flush();
  assert.equal(view.calls, 1);
  assert.equal(view.cancelled, 1);
  assert.equal(view.states[0].status, 'cancelled');
  assert.equal(view.states[1], null);
  assert.equal(view.hidden, 0);
});
test('failed cancellation keeps the pending checkout and displays the error', async () => {
  const view = harness({ cancel: async () => { throw new Error('Provider unreachable'); } });
  view.button('Cancel payment checkout').props.onClick();
  view.button('Yes, cancel checkout').props.onClick();
  await flush();
  assert.equal(view.states[0].status, 'pending');
  assert.equal(view.states[2], 'Provider unreachable');
  assert.equal(view.cancelled, 0);
});
test('a late status response cannot restore a cancelled checkout', async () => {
  let finish;
  const view = harness({ verify: () => new Promise(resolve => { finish = resolve; }) });
  view.button('Check payment').props.onClick();
  view.button('Cancel payment checkout').props.onClick();
  view.button('Yes, cancel checkout').props.onClick();
  await flush();
  finish({ status: 'pending', amount: 100 });
  await flush();
  assert.equal(view.states[0].status, 'cancelled');
});
