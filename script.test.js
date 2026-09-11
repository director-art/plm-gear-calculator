import test from 'node:test';
import assert from 'node:assert/strict';

const element = () => ({
  value: '', textContent: '', checked: false, readOnly: false, disabled: false, hidden: false,
  addEventListener() {}, setAttribute() {}, classList: { toggle() {} },
});
global.document = { querySelector: element, querySelectorAll: () => [] };

const { calculateComparison, calculateConfiguration, calculateRatio } = await import('./script.js');

test('calculates ratio and configuration values', () => {
  assert.equal(calculateRatio(12, 21), 1.75);
  const config = calculateConfiguration(6000, 1.75, 13);
  assert.equal(Math.round(config.shaftRpm), 3429);
  assert.equal(config.theoreticalSpeed.toFixed(1), '67.9');
});

test('compares a gearbox replacement', () => {
  const result = calculateComparison({
    oldEngineRpm: 6000, newEngineRpm: 6000, oldRatio: 1.75, newRatio: 27 / 13,
    oldPitch: 13, newPitch: 13, actualSpeed: 45,
  });
  assert.equal(Math.round(result.newConfig.shaftRpm), 2889);
  assert.equal(result.slip.toFixed(1), '33.8');
  assert.equal(result.newCalculatedSpeed.toFixed(1), '37.9');
  assert.equal(result.torqueChange.toFixed(1), '18.7');
});

test('compares a propeller replacement and changed engine RPM', () => {
  const result = calculateComparison({
    oldEngineRpm: 6000, newEngineRpm: 5700, oldRatio: 1.75, newRatio: 1.75,
    oldPitch: 13, newPitch: 15, actualSpeed: 45,
  });
  assert.equal(result.ratioChange, 0);
  assert.equal(result.pitchChange.toFixed(1), '15.4');
  assert.equal(result.shaftChange.toFixed(1), '-5.0');
  assert.equal(result.newCalculatedSpeed.toFixed(1), '49.3');
});

test('marks slip invalid when actual speed exceeds theoretical speed', () => {
  const result = calculateComparison({
    oldEngineRpm: 6000, newEngineRpm: 6000, oldRatio: 1.75, newRatio: 2.08,
    oldPitch: 13, newPitch: 13, actualSpeed: 80,
  });
  assert.equal(result.validSlip, false);
  assert.equal(result.newCalculatedSpeed, null);
  assert.equal(result.calculatedChange, null);
});

test('accepts zero actual speed without producing an invalid percentage', () => {
  const result = calculateComparison({
    oldEngineRpm: 6000, newEngineRpm: 6000, oldRatio: 1.75, newRatio: 2.08,
    oldPitch: 13, newPitch: 13, actualSpeed: 0,
  });
  assert.equal(result.slip, 100);
  assert.equal(result.newCalculatedSpeed, 0);
  assert.equal(result.calculatedChange, null);
});
