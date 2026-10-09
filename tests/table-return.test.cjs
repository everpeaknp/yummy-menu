const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const realRequire = require;
const compile = file => ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const config = { exports: {} };
vm.runInNewContext(compile('../src/config/restaurants.ts'), config);
function render(session, sessionWarning = '') {
  const exports = {};
  vm.runInNewContext(compile('../src/components/ActiveTableReturn.tsx'), {
    exports,
    require: name => {
      if (name === '@/context/CartContext') return { useCart: () => ({ session, sessionWarning, refreshSession: async () => {} }) };
      if (name === '@/config/restaurants') return config.exports;
      if (name === 'next/link') return { default: props => React.createElement('a', props, props.children) };
      return realRequire(name);
    },
  });
  return renderToStaticMarkup(React.createElement(exports.default));
}
const saved = { restaurantId: 52, restaurantName: 'Yummy Cafe', tableId: 8, tableName: 'c1', qrToken: 'private-table-token', activeOrderIds: [51408], orderedItems: [] };

test('home return goes directly to the saved restaurant active order without another scan', () => {
  const html = render(saved);
  assert.match(html, /href="\/52\/yummy-cafe\?view=order"/);
  assert.match(html, /Back to your table/);
  assert.match(html, /Table c1/);
  assert.match(html, /Active order/);
  assert.ok(!html.includes(saved.qrToken));
});
test('a connected table without orders returns to its menu', () => {
  const html = render({ ...saved, activeOrderIds: [], orderedItems: [] });
  assert.match(html, /href="\/52\/yummy-cafe\?view=menu"/);
  assert.ok(!html.includes('Active order'));
});
test('ended session has no return card, and temporary connection warning keeps the return path', () => {
  assert.equal(render(null), '');
  const html = render(saved, 'Connection interrupted. Your table and draft are saved.');
  assert.match(html, /view=order/);
  assert.match(html, /Connection interrupted/);
});
