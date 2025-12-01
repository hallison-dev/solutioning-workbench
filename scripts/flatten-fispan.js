#!/usr/bin/env node
// Simple flattener: node scripts/flatten-fispan.js input.json output.json
// Produces an array of { key, sampleValue, valueType, description, candidatePhases, railsCovered }
const fs = require('fs');
const path = require('path');

function inferPhasesForKey(key) {
  const k = key.toLowerCase();
  const phases = new Set(['phase-4']); // master by default
  if (/routing|accountnumber|iban|transit|sortcode|bic|bankaccount|bankexternalid/.test(k)) phases.add('phase-2-erp');
  if (/payment|paymentdefaults|preferredpayment|vendor|remittedamount|amount|currency/.test(k)) phases.add('phase-2-plugin');
  if (/pgp|encryption|filenam|transmission|validation|naming/.test(k)) phases.add('phase-3-platform');
  return Array.from(phases);
}

function flatten(obj, prefix = '') {
  const out = [];
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== 'object') {
    out.push({ key: prefix, sampleValue: obj, valueType: typeof obj });
    return out;
  }
  if (Array.isArray(obj)) {
    // flatten first element shape, omit numeric indices
    if (obj.length === 0) return [{ key: prefix, sampleValue: null, valueType: 'array' }];
    const sample = obj[0];
    const child = flatten(sample, prefix.replace(/\[\d+\]/g, ''));
    // if children had empty keys, map to prefix
    if (child.length === 0) return [{ key: prefix, sampleValue: null, valueType: 'array' }];
    return child.map(c => ({ ...c, key: c.key }));
  }
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    const nextKey = prefix ? `${prefix}.${k}` : k;
    if (v === null || typeof v !== 'object') {
      out.push({ key: nextKey, sampleValue: v, valueType: typeof v });
    } else {
      out.push(...flatten(v, nextKey));
    }
  });
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Usage: node scripts/flatten-fispan.js input.json output.json');
    process.exit(2);
  }
  const inputPath = path.resolve(argv[0]);
  const outPath = path.resolve(argv[1]);
  const raw = fs.readFileSync(inputPath, 'utf8');
  const obj = JSON.parse(raw);
  const flat = flatten(obj);
  const enriched = flat.map(f => ({
    key: f.key.replace(/\.\d+/g, ''),
    sampleValue: f.sampleValue,
    valueType: f.valueType,
    description: '',
    candidatePhases: inferPhasesForKey(f.key),
    railsCovered: []
  }));
  fs.writeFileSync(outPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log('Wrote', outPath, 'entries:', enriched.length);
}

if (require.main === module) main();
