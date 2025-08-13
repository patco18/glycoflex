require('ts-node/register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const CryptoJS = require('crypto-js');
const { SimpleCrypto } = require('../utils/simpleCrypto');

const sample = { foo: 'bar', value: 42 };

test('encrypt and decrypt roundtrip', () => {
  const key = SimpleCrypto.generateKey(32);
  const encrypted = SimpleCrypto.encrypt(sample, key);
  assert.ok(!encrypted.startsWith('BASIC:'), 'no BASIC fallback');
  const decrypted = SimpleCrypto.decrypt(encrypted, key);
  assert.deepStrictEqual(decrypted, sample);
});

test('encrypt throws when AES fails', () => {
  const key = SimpleCrypto.generateKey(32);
  const original = CryptoJS.AES.encrypt;
  CryptoJS.AES.encrypt = () => { throw new Error('fail'); };
  try {
    assert.throws(() => SimpleCrypto.encrypt(sample, key));
  } finally {
    CryptoJS.AES.encrypt = original;
  }
});

test('decrypt fails with wrong key', () => {
  const key1 = SimpleCrypto.generateKey(32);
  const key2 = SimpleCrypto.generateKey(32);
  const encrypted = SimpleCrypto.encrypt(sample, key1);
  assert.throws(() => SimpleCrypto.decrypt(encrypted, key2));
});
