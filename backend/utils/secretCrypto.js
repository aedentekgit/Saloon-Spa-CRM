const crypto = require('crypto');

const PREFIX = 'enc:v1';

const getKey = () => {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) return null;
  // Derive a stable 32-byte key from any string input
  return crypto.createHash('sha256').update(String(raw)).digest();
};

const isEncrypted = (value) => typeof value === 'string' && value.startsWith(`${PREFIX}:`);

const encrypt = (plaintext) => {
  const key = getKey();
  if (!key) return plaintext;
  if (plaintext === undefined || plaintext === null) return plaintext;
  if (plaintext === '') return '';

  const text = String(plaintext);
  if (isEncrypted(text)) return text;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
};

const decrypt = (value) => {
  const key = getKey();
  if (!key) return value;
  if (!isEncrypted(value)) return value;

  const parts = String(value).split(':');
  // enc:v1:<iv>:<tag>:<cipher>
  if (parts.length !== 5) return value;

  const iv = Buffer.from(parts[2], 'base64');
  const tag = Buffer.from(parts[3], 'base64');
  const ciphertext = Buffer.from(parts[4], 'base64');

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return plaintext;
  } catch {
    // If key rotated or data corrupt, fail closed: return original encrypted blob
    return value;
  }
};

module.exports = {
  encrypt,
  decrypt,
  isEncrypted
};

