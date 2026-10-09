const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').resolve(__dirname, '../src/services/api.ts'), 'utf8');

function loadApi(responses) {
  const calls = [];
  const client = {
    defaults: {},
    interceptors: { request: { use() {} }, response: { use() {} } },
    async get(path) {
      calls.push(path);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return { data: response };
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, {
    exports, require: () => ({ create: () => client }), URL,
    process: { env: { NEXT_PUBLIC_API_URL: 'https://api.example.com' } },
    console: { log() {}, error() {} },
  });
  return { api: exports, calls };
}
const row = { id: 52, name: 'Cafe', address: 'Pokhara', phone: '123',
  profile_picture: 'https://media.example.com/logo', cover_photo: 'https://media.example.com/cover',
  billing_mode: 'paid', plan_state: 'paid' };
function failure(status, data = {}) {
  return Object.assign(new Error('request failed'), { response: { status, data } });
}

test('directory preserves discovery card fields and sitemap identifiers', async () => {
  const { api, calls } = loadApi([{ data: [row] }]);
  const list = await api.getAllRestaurants(true);
  assert.equal(list[0].id, 52);
  assert.equal(list[0].name, 'Cafe');
  assert.equal(list[0].address, 'Pokhara');
  assert.equal(list[0].phone, '123');
  assert.equal(list[0].logo, row.profile_picture);
  assert.equal(list[0].cover_image, row.cover_photo);
  assert.deepEqual(calls, ['/restaurants/directory']);
});
test('old server 404 falls back without losing eligibility filtering', async () => {
  const { api, calls } = loadApi([failure(404), { data: [row, { ...row, id: 2, billing_mode: 'free' }] }]);
  assert.equal((await api.getAllRestaurants(true)).length, 1);
  assert.deepEqual(calls, ['/restaurants/directory', '/restaurants/']);
});
test('old server numeric route validation falls back', async () => {
  const { api, calls } = loadApi([failure(422, { errors: [{ field: 'restaurant_id', error: 'Input should be a valid integer' }] }), [row]]);
  assert.equal((await api.getAllRestaurants(true)).length, 1);
  assert.equal(calls.length, 2);
});
for (const status of [401, 500, 422]) {
  test('real error ' + status + ' is not masked by fallback', async () => {
    const { api, calls } = loadApi([failure(status)]);
    await assert.rejects(api.getAllRestaurants(true));
    assert.equal(calls.length, 1);
  });
}
test('empty directory is handled without fallback', async () => {
  const { api, calls } = loadApi([{ data: [] }]);
  assert.equal((await api.getAllRestaurants(true)).length, 0);
  assert.equal(calls.length, 1);
});
test('individual restaurant lookup still uses its detail endpoint', async () => {
  const { api, calls } = loadApi([{ data: row }]);
  assert.equal((await api.getRestaurant('52')).id, 52);
  assert.deepEqual(calls, ['/restaurants/52/']);
});
