const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
test('menu exposes a return path to an already approved table when the scanned table is pending', () => {
  const menu = fs.readFileSync(path.resolve(__dirname, '../src/components/MenuGrid.tsx'), 'utf8');
  assert.match(menu, /ExistingTableReturn/);
  assert.match(menu, /<ExistingTableReturn\s/);
  assert.match(menu, /session\.tableId/);
});
