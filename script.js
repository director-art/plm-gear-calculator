const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const fields = Object.fromEntries([
  'engine-rpm', 'old-drive', 'old-driven', 'old-ratio', 'old-pitch', 'old-diameter', 'actual-speed',
  'new-drive', 'new-driven', 'new-ratio', 'new-pitch', 'new-diameter', 'new-engine-rpm',
].map((id) => [id, $(`#${id}`)]));

const integerFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ratioFormat = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const jFormat = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function calculateRatio(driveTeeth, drivenTeeth) {
  return drivenTeeth / driveTeeth;
}

export function calculateConfiguration(engineRpm, ratio, pitch) {
  const shaftRpm = engineRpm / ratio;
  return {
    shaftRpm,
    theoreticalSpeed: shaftRpm * pitch * 0.0254 * 60 / 1000,
  };
}

export function calculateAdvanceRatio(speedKmh, shaftRpm, diameterInches) {
  if (shaftRpm <= 0 || diameterInches <= 0) return null;
  const speedMs = speedKmh / 3.6;
  const revolutionsPerSecond = shaftRpm / 60;
  const diameterMeters = diameterInches * 0.0254;
  return speedMs / (revolutionsPerSecond * diameterMeters);
}

export function classifySlip(slip) {
  if (slip < 0) return { key: 'error', comment: 'Ошибка или несоответствие исходных данных' };
  if (slip < 5) return { key: 'low', comment: 'Ниже типичного диапазона — перепроверьте исходные данные' };
  if (slip <= 15) return { key: 'optimal', comment: 'Оптимально' };
  if (slip <= 20) return { key: 'acceptable', comment: 'Допустимо' };
  if (slip <= 25) return { key: 'elevated', comment: 'Повышенное' };
  return { key: 'high', comment: 'Высокое — проверьте установку/винт' };
}

export function calculateComparison({ oldEngineRpm, newEngineRpm, oldRatio, newRatio, oldPitch, newPitch, oldDiameter, newDiameter, actualSpeed }) {
  const oldConfig = calculateConfiguration(oldEngineRpm, oldRatio, oldPitch);
  const newConfig = calculateConfiguration(newEngineRpm, newRatio, newPitch);
  const slip = (oldConfig.theoreticalSpeed - actualSpeed) / oldConfig.theoreticalSpeed * 100;
  const validSlip = slip >= 0 && slip <= 100;
  const newCalculatedSpeed = validSlip ? newConfig.theoreticalSpeed * (1 - slip / 100) : null;
  const oldAdvanceRatio = calculateAdvanceRatio(actualSpeed, oldConfig.shaftRpm, oldDiameter);
  const newAdvanceRatio = newCalculatedSpeed === null ? null : calculateAdvanceRatio(newCalculatedSpeed, newConfig.shaftRpm, newDiameter);

  return {
    oldConfig, newConfig, slip, validSlip, newCalculatedSpeed, oldAdvanceRatio, newAdvanceRatio,
    shaftChange: percentChange(oldConfig.shaftRpm, newConfig.shaftRpm),
    ratioChange: percentChange(oldRatio, newRatio),
    pitchChange: percentChange(oldPitch, newPitch),
    theoreticalChange: percentChange(oldConfig.theoreticalSpeed, newConfig.theoreticalSpeed),
    calculatedChange: newCalculatedSpeed === null || actualSpeed === 0 ? null : percentChange(actualSpeed, newCalculatedSpeed),
    torqueChange: percentChange(oldRatio, newRatio),
  };
}

function percentChange(oldValue, newValue) {
  return (newValue / oldValue - 1) * 100;
}

function parseNumber(value) {
  return Number(value.trim().replace(',', '.').replace(/\s/g, ''));
}

function validate(field, { integer = false, allowZero = false } = {}) {
  const value = parseNumber(field.value);
  const rangeValid = allowZero ? value >= 0 : value > 0;
  const valid = Number.isFinite(value) && rangeValid && (!integer || Number.isInteger(value));
  const requirement = integer ? 'положительное целое число' : allowZero ? 'число не меньше нуля' : 'число больше нуля';
  $(`#${field.id}-error`).textContent = valid ? '' : `Введите ${requirement}`;
  field.setAttribute('aria-invalid', String(!valid));
  return valid ? value : null;
}

function clearValidation(field) {
  $(`#${field.id}-error`).textContent = '';
  field.setAttribute('aria-invalid', 'false');
}

function readRatio(prefix, active = true) {
  if (!active) return null;
  if ($(`#${prefix}-manual`).checked) return validate(fields[`${prefix}-ratio`]);
  const drive = validate(fields[`${prefix}-drive`], { integer: true });
  const driven = validate(fields[`${prefix}-driven`], { integer: true });
  if (drive === null || driven === null) return null;
  const ratio = calculateRatio(drive, driven);
  fields[`${prefix}-ratio`].value = ratioFormat.format(ratio);
  clearValidation(fields[`${prefix}-ratio`]);
  return ratio;
}

function formatPercent(value) {
  if (value === null) return '—';
  if (Math.abs(value) < 0.05) return '0,0%';
  return `${value > 0 ? '+' : '−'}${decimalFormat.format(Math.abs(value))}%`;
}

function setText(id, value) {
  $(`#${id}`).textContent = value;
}

function setManualMode(prefix) {
  const manual = $(`#${prefix}-manual`).checked;
  fields[`${prefix}-ratio`].readOnly = !manual;
  fields[`${prefix}-drive`].disabled = manual;
  fields[`${prefix}-driven`].disabled = manual;
  clearValidation(fields[`${prefix}-drive`]);
  clearValidation(fields[`${prefix}-driven`]);
  update();
}

function applyMode() {
  const mode = $('input[name="change-mode"]:checked').value;
  const changesGearbox = mode !== 'propeller';
  const changesPropeller = mode !== 'gearbox';
  $('#new-gearbox-fields').hidden = !changesGearbox;
  $('#new-propeller-fields').hidden = !changesPropeller;
  ['new-drive', 'new-driven', 'new-ratio'].forEach((id) => { fields[id].disabled = !changesGearbox; });
  ['new-pitch', 'new-diameter', 'new-engine-rpm'].forEach((id) => { fields[id].disabled = !changesPropeller; });
  if (changesGearbox) setManualMode('new'); else update();
}

function applySlipAppearance(slip) {
  const classification = classifySlip(slip);
  const card = $('#slip-card');
  const value = $('#slip-result');
  card.className = `slip-card slip-${classification.key}`;
  value.className = `slip-${classification.key}`;
  setText('slip-comment', classification.comment);
}

function update() {
  const mode = $('input[name="change-mode"]:checked').value;
  const changesGearbox = mode !== 'propeller';
  const changesPropeller = mode !== 'gearbox';
  const oldEngineRpm = validate(fields['engine-rpm']);
  const oldRatio = readRatio('old');
  const oldPitch = validate(fields['old-pitch']);
  const oldDiameter = validate(fields['old-diameter']);
  const actualSpeed = validate(fields['actual-speed'], { allowZero: true });
  const newRatio = changesGearbox ? readRatio('new') : oldRatio;
  const newPitch = changesPropeller ? validate(fields['new-pitch']) : oldPitch;
  const newDiameter = changesPropeller ? validate(fields['new-diameter']) : oldDiameter;
  const rpmText = fields['new-engine-rpm'].value.trim();
  const newEngineRpm = changesPropeller && rpmText ? validate(fields['new-engine-rpm']) : oldEngineRpm;
  if (!rpmText) clearValidation(fields['new-engine-rpm']);
  if ([oldEngineRpm, oldRatio, oldPitch, oldDiameter, actualSpeed, newRatio, newPitch, newDiameter, newEngineRpm].some((value) => value === null)) return;

  const result = calculateComparison({ oldEngineRpm, newEngineRpm, oldRatio, newRatio, oldPitch, newPitch, oldDiameter, newDiameter, actualSpeed });
  setText('old-ratio-result', `${ratioFormat.format(oldRatio)} : 1`);
  setText('new-ratio-result', `${ratioFormat.format(newRatio)} : 1`);
  setText('old-pitch-result', `${decimalFormat.format(oldPitch)}″`);
  setText('new-pitch-result', `${decimalFormat.format(newPitch)}″`);
  setText('old-diameter-result', `${decimalFormat.format(oldDiameter)}″`);
  setText('new-diameter-result', `${decimalFormat.format(newDiameter)}″`);
  setText('old-engine-result', integerFormat.format(oldEngineRpm));
  setText('new-engine-result', integerFormat.format(newEngineRpm));
  setText('old-shaft-result', integerFormat.format(result.oldConfig.shaftRpm));
  setText('new-shaft-result', integerFormat.format(result.newConfig.shaftRpm));
  setText('old-theoretical-result', `${decimalFormat.format(result.oldConfig.theoreticalSpeed)} км/ч`);
  setText('new-theoretical-result', `${decimalFormat.format(result.newConfig.theoreticalSpeed)} км/ч`);
  setText('old-calculated-result', `${decimalFormat.format(actualSpeed)} км/ч`);
  setText('new-calculated-result', result.validSlip ? `${decimalFormat.format(result.newCalculatedSpeed)} км/ч` : '—');
  setText('old-j-result', result.oldAdvanceRatio === null ? '—' : jFormat.format(result.oldAdvanceRatio));
  setText('new-j-result', result.newAdvanceRatio === null ? '—' : jFormat.format(result.newAdvanceRatio));
  setText('slip-result', `${result.slip < 0 ? '−' : ''}${decimalFormat.format(Math.abs(result.slip))}%`);
  setText('shaft-change', formatPercent(result.shaftChange));
  setText('ratio-change', formatPercent(result.ratioChange));
  setText('pitch-change', formatPercent(result.pitchChange));
  setText('theoretical-change', formatPercent(result.theoreticalChange));
  setText('calculated-change', formatPercent(result.calculatedChange));
  setText('torque-change', formatPercent(result.torqueChange));
  applySlipAppearance(result.slip);
}

Object.values(fields).forEach((field) => field.addEventListener('input', update));
['old', 'new'].forEach((prefix) => $(`#${prefix}-manual`).addEventListener('change', () => setManualMode(prefix)));
$$('input[name="change-mode"]').forEach((radio) => radio.addEventListener('change', applyMode));
update();
