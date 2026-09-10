import test from 'node:test';
import assert from 'node:assert/strict';
const element = () => ({ value:'', textContent:'', checked:false, readOnly:false, disabled:false, addEventListener(){}, setAttribute(){}, classList:{toggle(){}} });
global.document = { querySelector: element };
const { calculateGearbox, calculateRatio } = await import('./script.js');
test('calculates a ratio from gear tooth counts', () => { assert.equal(calculateRatio(12,21),1.75); assert.equal(calculateRatio(13,27).toFixed(2),'2.08'); });
test('calculates extended gearbox comparison', () => { const r=calculateGearbox({engineRpm:6000,oldRatio:1.75,newRatio:27/13,pitch:13,actualSpeed:45}); assert.equal(Math.round(r.oldShaftRpm),3429); assert.equal(Math.round(r.newShaftRpm),2889); assert.equal(r.rpmChange.toFixed(1),'-15.7'); assert.equal(r.torqueChange.toFixed(1),'18.7'); assert.equal(r.slip.toFixed(1),'33.8'); assert.equal(r.projectedSpeed.toFixed(1),'37.9'); assert.equal(r.requiredPitch.toFixed(1),'15.4'); });
test('allows zero actual speed', () => { const r=calculateGearbox({engineRpm:6000,oldRatio:1.75,newRatio:2.08,pitch:13,actualSpeed:0}); assert.equal(r.slip,100); assert.equal(r.projectedSpeed,0); });
