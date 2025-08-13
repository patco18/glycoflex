import CryptoJS from 'crypto-js';
import { SimpleCrypto } from '@/utils/simpleCrypto';

describe('SimpleCrypto', () => {
  const sample = { foo: 'bar', value: 42 };

  test('encrypt and decrypt roundtrip', () => {
    const key = SimpleCrypto.generateKey(32);
    const encrypted = SimpleCrypto.encrypt(sample, key);
    expect(encrypted.startsWith('BASIC:')).toBe(false);
    const decrypted = SimpleCrypto.decrypt(encrypted, key);
    expect(decrypted).toEqual(sample);
  });

  test('encrypt throws when AES fails', () => {
    const key = SimpleCrypto.generateKey(32);
    const original = CryptoJS.AES.encrypt;
    // @ts-ignore
    CryptoJS.AES.encrypt = () => { throw new Error('fail'); };
    expect(() => SimpleCrypto.encrypt(sample, key)).toThrow();
    CryptoJS.AES.encrypt = original;
  });

  test('decrypt fails with wrong key', () => {
    const key1 = SimpleCrypto.generateKey(32);
    const key2 = SimpleCrypto.generateKey(32);
    const encrypted = SimpleCrypto.encrypt(sample, key1);
    expect(() => SimpleCrypto.decrypt(encrypted, key2)).toThrow();
  });
});
