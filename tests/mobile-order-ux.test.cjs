const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.resolve(__dirname, file), 'utf8');

test('mobile order screen keeps send and payment actions in a fixed action dock', () => {
  const source = read('../src/components/FloatingCart.tsx');
  assert.match(source, /data-mobile-order-actions/);
  assert.match(source, /aria-label="Order actions"/);
  assert.match(source, /lg:hidden/);
  assert.match(source, /Send order request/);
  assert.match(source, /Pay your bill/);
  assert.match(source, /compact \? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-stone-950 text-white hover:bg-orange-700'/);
});

test('order screen keeps table management collapsed until the customer asks for it', () => {
  const source = read('../src/components/MenuGrid.tsx');
  assert.match(source, /<details[^>]*aria-label="Table and guest controls"/);
  assert.match(source, /<summary[^>]*>.*Manage table/s);
});

test('order table summary distinguishes a pending request from an expired request that can be resubmitted', () => {
  const source = read('../src/components/MenuGrid.tsx');
  assert.match(source, /tableAccess\?\.access === 'pending'\s*\?\s*'Awaiting approval'/);
  assert.match(source, /Tap to request/);
  assert.match(source, /tableAccess\?\.access === 'expired' && tableAccess\.visit_id\s*\?\s*'Visit expired'/);
});
