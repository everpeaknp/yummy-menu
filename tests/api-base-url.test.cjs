const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(require('node:path').resolve(__dirname, '../src/services/api.ts'), 'utf8');

function loadApi({ envUrl, storedUrl }) {
  const client = {
    defaults: {},
    interceptors: { request: { use() {} }, response: { use() {} } },
  };
  const storage = new Map(storedUrl ? [['yummy_api_url', storedUrl]] : []);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, {
    exports,
    require: () => ({ create: options => {
      client.defaults = { ...options };
      return client;
    } }),
    URL,
    process: { env: envUrl ? { NEXT_PUBLIC_API_URL: envUrl } : {} },
    window: {},
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    console: { log() {}, error() {} },
  });
  return { api: exports, client };
}

test('configured API environment takes precedence over a stale saved API URL', () => {
  const { client } = loadApi({
    envUrl: 'https://test-api.example.com',
    storedUrl: 'https://api.example.com',
  });

  assert.equal(client.defaults.baseURL, 'https://test-api.example.com');
});

test('saved local POS API URL remains usable when no API environment is configured', () => {
  const { client } = loadApi({ storedUrl: 'http://192.168.1.20:8001' });

  assert.equal(client.defaults.baseURL, 'http://192.168.1.20:8001');
});
