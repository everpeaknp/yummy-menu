const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function render(file, props, checkout) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  let state = 0;
  vm.runInNewContext(source, { exports, require: name => {
    if (name === 'react') return { ...React, useEffect: () => {}, useState: initial => React.useState(state++ === 0 && checkout ? checkout : initial) };
    if (name === '@/services/api') return {};
    if (name === '@/lib/useDialog') return { useDialog: () => ({ current: null }) };
    return require(name);
  } });
  return renderToStaticMarkup(React.createElement(exports.default, props));
}
const item = (id, name, yours, customer, amount = 50) => ({ id, name, is_yours: yours, bill_customer_id: customer,
  bill_customer_name: `Friend ${customer}`, quantity: 1, line_total: amount, status: 'pending' });

test('personal and named friend items render in separate bill sections with their own totals', () => {
  const html = render('OrderedBillItems.tsx', { items: [item(1, 'Coke', true, 1), item(2, 'Momo', false, 2, 100), item(3, 'Tea', false, 3)] });
  const sections = html.split('<section').slice(1);
  assert.equal(sections.length, 3);
  assert.match(sections[0], /Your items/);
  assert.match(sections[0], /Coke/);
  assert.doesNotMatch(sections[0], /Momo|Tea/);
  assert.match(sections[1], /Friend 2/);
  assert.match(sections[1], /100/);
  assert.match(sections[2], /Friend 3/);
  assert.match(html, /Not included in your payment/);
});
test('merged items on one bill stay in one list, without original-customer grouping', () => {
  const html = render('OrderedBillItems.tsx', { items: [item(1, 'Coke', true, 1), item(2, 'Momo', true, 1)] });
  assert.equal(html.split('<section').length - 1, 1);
  assert.match(html, /Coke/);
  assert.match(html, /Momo/);
  assert.doesNotMatch(html, /Friend 1|Separate bill/);
});
test('no personal orders does not label friends items as yours, and missing names have a fallback', () => {
  const html = render('OrderedBillItems.tsx', { items: [{ ...item(2, 'Tea', false, 2), bill_customer_name: null }] });
  assert.match(html, /You haven’t sent any items yet/);
  assert.match(html, /Table companion/);
});
test('pending food requests remain labeled as awaiting acceptance', () => {
  const html = render('OrderedBillItems.tsx', { items: [{ ...item(1, 'Tea', true, 1), status: 'requested' }] });
  assert.match(html, /Awaiting acceptance/);
  assert.match(html, /Pending requests are estimates/);
});
test('checkout shows server bill items and amount due, not a table total', () => {
  const html = render('CustomerFonepayCheckout.tsx', { open: true, qrToken: 'printed', onClose() {}, onPaid: async () => {} }, {
    order_id: 1, prn: 'test', status: 'pending', amount: 40, restaurant_name: 'Yummy', table_name: 'g',
    items: [{ id: 1, name: 'Coke', quantity: 2, line_total: 50, modifiers: ['Ice'] }],
  });
  assert.match(html, /Items on this bill/);
  assert.match(html, /2×/);
  assert.match(html, /Coke/);
  assert.match(html, /Ice/);
  assert.match(html, /Amount due/);
  assert.match(html, /before bill-level taxes, discounts and previous payments/);
});
