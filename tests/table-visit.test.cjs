const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/TableVisitAccess.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function render(access, states = {}) {
  const exports = {};
  let stateIndex = 0;
  vm.runInNewContext(source, { exports, require: name => {
    if (name === 'react') return { ...React, useEffect: () => {}, useState: initial => React.useState(states[stateIndex++] ?? initial) };
    if (name === '@/context/CartContext') return { useCart: () => ({ session: {
      tableName: 'g5', qrToken: 'printed', tableAccess: access,
    }, refreshSession: async () => {} }) };
    if (name === '@/services/api') return {};
    if (name === '@/lib/useDialog') return { useDialog: () => ({ current: null }) };
    return require(name);
  } });
  return renderToStaticMarkup(React.createElement(exports.default));
}

test('unverified guests can request access, not generate invitations', () => {
  const html = render({ access: 'unverified', is_host: false, members: [] });
  assert.match(html, /Request table access/);
  assert.ok(!html.includes('Generate friend invite'));
});
test('occupied table directs outsiders to host rather than offering takeover', () => {
  const html = render({ access: 'occupied', is_host: false, members: [] });
  assert.match(html, /Ask them for an invite QR/);
  assert.ok(!html.includes('Request table access'));
});
test('host can approve pending guests; approved guests cannot invite others', () => {
  const members = [{ account_id: 1, name: 'Host', status: 'approved', is_host: true },
    { account_id: 2, name: 'Friend', status: 'pending', is_host: false }];
  const host = render({ access: 'approved', is_host: true, members });
  assert.match(host, /Invite friends/);
  assert.match(host, /Approve guest/);
  assert.ok(!host.includes('Make host')); // Pending guest cannot become host.
  const guest = render({ access: 'approved', is_host: false, members: [] });
  assert.ok(!guest.includes('Generate friend invite QR'));
  assert.ok(!guest.includes('Approve guest'));
});

test('joined roster identifies host and viewer without exposing removed guests or management actions', () => {
  const html = render({ access: 'approved', is_host: false, members: [
    { account_id: 1, name: 'Niraj', status: 'approved', is_host: true },
    { account_id: 2, name: 'Everacy', status: 'approved', is_you: true },
    { account_id: 3, name: 'Removed person', status: 'removed' },
  ] });
  assert.match(html, /At your table/);
  assert.match(html, /Niraj/);
  assert.match(html, /Table host/);
  assert.match(html, /Everacy/);
  assert.match(html, /\(you\)/);
  assert.ok(!html.includes('Removed person'));
  assert.ok(!html.includes('Manage guests'));
  assert.ok(!html.includes('Make host'));
});

test('invite dialog has accessible QR, expiry and copy action', () => {
  const html = render({ access: 'approved', is_host: true, visit_id: 1, members: [] }, {
    3: 'invite', 4: { image: 'data:image/png;base64,preview', url: 'https://example.test/join-table#private', expires: new Date(Date.now() + 60000).toISOString() },
  });
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Scan to request to join this table/);
  assert.match(html, /Link expires in/);
  assert.match(html, /Copy invite link/);
  assert.ok(!html.includes('https://example.test/join-table#private')); // Token is never rendered as plain text.
});

test('management controls are kept out of the menu and available in the guest dialog', () => {
  const access = { access: 'approved', is_host: true, members: [
    { account_id: 1, name: 'Niraj', is_host: true, status: 'approved' },
    { account_id: 2, name: 'Everacy', status: 'approved' },
  ] };
  assert.ok(!render(access).includes('Make host'));
  const html = render(access, { 3: 'members' });
  assert.match(html, /Make host/);
  assert.match(html, /Remove/);
  assert.match(html, /aria-label="Close"/);
});
