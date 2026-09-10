import test from 'node:test';
import assert from 'node:assert/strict';

global.document = {
  querySelector() {
    return { value: '', textContent: '', addEventListener() {}, setAttribute() {} };
  },
};

const { calculateGearbox } = await import('./script.js');

test('calculates the default gearbox comparison', () => {
  const result = calculateGearbox(6000, 1.75, 2.08);

  assert.equal(Math.round(result.oldShaftRpm), 3429);
  assert.equal(Math.round(result.newShaftRpm), 2885);
  assert.equal(result.rpmChange.toFixed(1), '-15.9');
  assert.equal(result.torqueChange.toFixed(1), '18.9');
});
