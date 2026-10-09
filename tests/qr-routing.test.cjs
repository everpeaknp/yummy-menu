const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').resolve(__dirname, '../src/app/qr/[token]/page.tsx'), 'utf8');

for (const mode of ['cloud', 'local', 'unreachable']) {
  test('QR routing preserves table session in ' + mode + ' mode', async () => {
    let effect;
    let complete;
    const done = new Promise(resolve => { complete = resolve; });
    const saved = new Map();
    const bases = [];
    const exports = {};
    const context = { restaurant_id: 52, restaurant_name: 'Cafe', table_id: 8,
      table_name: 'Table 8', token: 'verified-token', active_orders: [{ id: 12, grand_total: 100 }],
      local_pos_ip: mode === 'cloud' ? null : '192.168.1.10' };
    vm.runInNewContext(ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, {
      exports, setTimeout, clearTimeout, AbortController, Event,
      process: { env: { NEXT_PUBLIC_API_URL: 'https://api.example.com' } },
      localStorage: { setItem: (key, value) => saved.set(key, value) },
      window: { dispatchEvent() {} },
      fetch: async () => { if (mode === 'unreachable') throw new Error('offline'); return { ok: true }; },
      require: name => {
        if (name === 'react') return { useEffect: fn => { effect = fn; }, useState: value => [value, () => {}] };
        if (name === 'next/navigation') return { useParams: () => ({ token: 'scanned-token' }), useRouter: () => ({ replace: complete }) };
        if (name === '@/services/api') return { setBaseUrl: url => bases.push(url), verifyQRToken: async () => context };
        if (name === '@/config/restaurants') return { slugify: name => name.toLowerCase() };
        if (name === 'react/jsx-runtime') return { jsx() {}, jsxs() {} };
        return {};
      },
    });
    exports.default();
    const cleanup = effect();
    const route = await done;
    assert.equal(route, '/52/cafe?view=menu');
    assert.equal(saved.get('yummy_pos_mode'), mode === 'local' ? 'local' : 'cloud');
    assert.equal(bases[0], 'https://api.example.com');
    if (mode === 'local') assert.equal(bases[1], 'http://192.168.1.10:8001');
    const session = JSON.parse(saved.get('yummy_qr_session'));
    assert.equal(session.restaurantId, 52);
    assert.equal(session.tableId, 8);
    assert.equal(session.qrToken, 'verified-token');
    assert.equal(session.activeOrderTotal, 100);
    assert.equal(session.activeOrderIds[0], 12);
    cleanup();
  });
}
