// 5 public functions without any documentation
// The model must add complete JSDoc to all of them

const fs = require('fs');

function parseCSV(content, delimiter = ',', hasHeader = true) {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = hasHeader ? lines[0].split(delimiter).map(h => h.trim()) : null;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map(line => {
    const values = line.split(delimiter).map(v => v.trim());
    if (headers) {
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i] ?? '';
        return obj;
      }, {});
    }
    return values;
  });
}

function validateCPF(cpf) {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  return digit === parseInt(cleaned[10]);
}

function formatCurrency(amount, currency = 'BRL', locale = 'pt-BR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function calculateShipping(weightKg, distanceKm, expressDelivery = false) {
  if (weightKg <= 0 || distanceKm <= 0) throw new RangeError('Weight and distance must be positive');

  const baseRate = 2.50;
  const weightRate = weightKg * 0.85;
  const distanceRate = distanceKm * 0.012;
  let total = baseRate + weightRate + distanceRate;

  if (expressDelivery) total *= 1.75;
  if (distanceKm > 500) total *= 1.20;

  return Math.round(total * 100) / 100;
}

function generateSlug(text, maxLength = 60) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, maxLength)
    .replace(/-$/, '');
}

module.exports = { parseCSV, validateCPF, formatCurrency, calculateShipping, generateSlug };
