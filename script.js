const $ = (selector) => document.querySelector(selector);
const fields = { engineRpm: $('#engine-rpm'), oldDrive: $('#old-drive'), oldDriven: $('#old-driven'), newDrive: $('#new-drive'), newDriven: $('#new-driven'), oldRatio: $('#old-ratio'), newRatio: $('#new-ratio'), pitch: $('#pitch'), actualSpeed: $('#actual-speed') };
const integerFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const ratioFormatter = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const oneDecimalFormatter = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export function calculateRatio(driveTeeth, drivenTeeth) { return drivenTeeth / driveTeeth; }
export function calculateGearbox({ engineRpm, oldRatio, newRatio, pitch, actualSpeed }) {
  const oldShaftRpm = engineRpm / oldRatio, newShaftRpm = engineRpm / newRatio;
  const oldTheoreticalSpeed = oldShaftRpm * pitch * 0.0254 * 60 / 1000;
  const newTheoreticalSpeed = newShaftRpm * pitch * 0.0254 * 60 / 1000;
  const slip = (oldTheoreticalSpeed - actualSpeed) / oldTheoreticalSpeed * 100;
  return { oldShaftRpm, newShaftRpm, oldTheoreticalSpeed, newTheoreticalSpeed, rpmChange: (newShaftRpm / oldShaftRpm - 1) * 100, torqueChange: (newRatio / oldRatio - 1) * 100, slip, projectedSpeed: newTheoreticalSpeed * (1 - slip / 100), requiredPitch: pitch * newRatio / oldRatio };
}
function parseNumber(value) { return Number(value.trim().replace(',', '.').replace(/\s/g, '')); }
function validate(field, label, integer = false, allowZero = false) { const value = parseNumber(field.value); const valid = Number.isFinite(value) && (allowZero ? value >= 0 : value > 0) && (!integer || Number.isInteger(value)); $(`#${field.id}-error`).textContent = valid ? '' : `Введите ${integer ? 'целое число' : label} ${allowZero ? 'не меньше нуля' : 'больше нуля'}`; field.setAttribute('aria-invalid', String(!valid)); return valid ? value : null; }
function signedPercent(value) { if (Math.abs(value) < .05) return '0,0%'; return `${value > 0 ? '+' : '−'}${oneDecimalFormatter.format(Math.abs(value))}%`; }
function setManualMode(prefix) { const manual = $(`#${prefix}-manual`).checked; fields[`${prefix}Ratio`].readOnly = !manual; fields[`${prefix}Drive`].disabled = manual; fields[`${prefix}Driven`].disabled = manual; $(`#${prefix}-drive-error`).textContent = ''; $(`#${prefix}-driven-error`).textContent = ''; update(); }
function getRatio(prefix, drive, driven) { if ($(`#${prefix}-manual`).checked) return validate(fields[`${prefix}Ratio`], 'передаточное число'); if (drive === null || driven === null) return null; const ratio = calculateRatio(drive, driven); fields[`${prefix}Ratio`].value = ratioFormatter.format(ratio); $(`#${prefix}-ratio-error`).textContent = ''; return ratio; }
function update() {
  const engineRpm = validate(fields.engineRpm, 'обороты');
  const oldDrive = $('#old-manual').checked ? 1 : validate(fields.oldDrive, 'число зубьев', true), oldDriven = $('#old-manual').checked ? 1 : validate(fields.oldDriven, 'число зубьев', true);
  const newDrive = $('#new-manual').checked ? 1 : validate(fields.newDrive, 'число зубьев', true), newDriven = $('#new-manual').checked ? 1 : validate(fields.newDriven, 'число зубьев', true);
  const oldRatio = getRatio('old', oldDrive, oldDriven), newRatio = getRatio('new', newDrive, newDriven), pitch = validate(fields.pitch, 'шаг винта'), actualSpeed = validate(fields.actualSpeed, 'скорость', false, true);
  if ([engineRpm, oldRatio, newRatio, pitch, actualSpeed].some(v => v === null)) return;
  const r = calculateGearbox({ engineRpm, oldRatio, newRatio, pitch, actualSpeed });
  $('#old-rpm').textContent = integerFormatter.format(r.oldShaftRpm); $('#new-rpm').textContent = integerFormatter.format(r.newShaftRpm); $('#old-ratio-badge').textContent = `${ratioFormatter.format(oldRatio)} : 1`; $('#new-ratio-badge').textContent = `${ratioFormatter.format(newRatio)} : 1`; $('#old-speed').textContent = `${oneDecimalFormatter.format(r.oldTheoreticalSpeed)} км/ч`; $('#rpm-change').textContent = signedPercent(r.rpmChange); $('#torque-change').textContent = signedPercent(r.torqueChange); $('#projected-speed').textContent = oneDecimalFormatter.format(r.projectedSpeed); $('#required-pitch').textContent = oneDecimalFormatter.format(r.requiredPitch);
  if (actualSpeed > r.oldTheoreticalSpeed) { $('#slip').textContent = 'некорректно'; $('#slip').classList.toggle('value-warning', true); } else { $('#slip').textContent = `${oneDecimalFormatter.format(r.slip)}%`; $('#slip').classList.toggle('value-warning', false); }
}
Object.values(fields).filter((f, i, a) => a.indexOf(f) === i).forEach(f => f.addEventListener('input', update));
['old','new'].forEach(prefix => $(`#${prefix}-manual`).addEventListener('change', () => setManualMode(prefix)));
update();
