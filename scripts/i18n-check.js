const fs = require('fs');
const path = require('path');

function flatten(obj, prefix = '') {
  return Object.keys(obj).reduce((res, key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      Object.assign(res, flatten(value, newKey));
    } else {
      res[newKey] = true;
    }
    return res;
  }, {});
}

function checkLocales() {
  const localesDir = path.join(__dirname, '..', 'locales');
  const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
  const fr = JSON.parse(fs.readFileSync(path.join(localesDir, 'fr.json'), 'utf8'));

  const enKeys = Object.keys(flatten(en));
  const frKeys = Object.keys(flatten(fr));

  const missingInFr = enKeys.filter(k => !frKeys.includes(k));
  const missingInEn = frKeys.filter(k => !enKeys.includes(k));

  if (missingInFr.length || missingInEn.length) {
    if (missingInFr.length) {
      console.log('Missing keys in fr:', missingInFr.join(', '));
    }
    if (missingInEn.length) {
      console.log('Missing keys in en:', missingInEn.join(', '));
    }
    process.exitCode = 1;
  } else {
    console.log('Locales are synchronized.');
  }
}

if (require.main === module) {
  try {
    checkLocales();
  } catch (err) {
    console.error('Failed to check locales:', err);
    process.exit(1);
  }
}

module.exports = { checkLocales };
