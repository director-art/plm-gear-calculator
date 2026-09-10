const fields = {
  engineRpm: document.querySelector('#engine-rpm'),
  oldRatio: document.querySelector('#old-ratio'),
  newRatio: document.querySelector('#new-ratio'),
};

const output = {
  oldRpm: document.querySelector('#old-rpm'),
  newRpm: document.querySelector('#new-rpm'),
  rpmChange: document.querySelector('#rpm-change'),
  torqueChange: document.querySelector('#torque-change'),
  oldRatioBadge: document.querySelector('#old-ratio-badge'),
  newRatioBadge: document.querySelector('#new-ratio-badge'),
};

const integerFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function calculateGearbox(engineRpm, oldRatio, newRatio) {
  const oldShaftRpm = engineRpm / oldRatio;
  const newShaftRpm = engineRpm / newRatio;

  return {
    oldShaftRpm,
    newShaftRpm,
    rpmChange: (newShaftRpm / oldShaftRpm - 1) * 100,
    torqueChange: (newRatio / oldRatio - 1) * 100,
  };
}

function parseNumber(value) {
  return Number(value.trim().replace(',', '.').replace(/\s/g, ''));
}

function signedPercent(value) {
  if (Math.abs(value) < 0.05) return '0,0%';
  return `${value > 0 ? '+' : '−'}${percentFormatter.format(Math.abs(value))}%`;
}

function validate(field, label) {
  const value = parseNumber(field.value);
  const error = document.querySelector(`#${field.id}-error`);
  const valid = Number.isFinite(value) && value > 0;
  error.textContent = valid ? '' : `Введите ${label} больше нуля`;
  field.setAttribute('aria-invalid', String(!valid));
  return valid ? value : null;
}

function update() {
  const engineRpm = validate(fields.engineRpm, 'обороты');
  const oldRatio = validate(fields.oldRatio, 'передаточное число');
  const newRatio = validate(fields.newRatio, 'передаточное число');
  if (engineRpm === null || oldRatio === null || newRatio === null) return;

  const result = calculateGearbox(engineRpm, oldRatio, newRatio);
  output.oldRpm.textContent = integerFormatter.format(result.oldShaftRpm);
  output.newRpm.textContent = integerFormatter.format(result.newShaftRpm);
  output.rpmChange.textContent = signedPercent(result.rpmChange);
  output.torqueChange.textContent = signedPercent(result.torqueChange);
  output.oldRatioBadge.textContent = `${decimalFormatter.format(oldRatio)} : 1`;
  output.newRatioBadge.textContent = `${decimalFormatter.format(newRatio)} : 1`;
}

Object.values(fields).forEach((field) => field.addEventListener('input', update));
update();
