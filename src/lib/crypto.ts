import crypto from 'crypto';

// 32バイト（256ビット）の暗号化キーを取得
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-must-be-32-characters-long!';
// AES-256-CBCを使用するためのキーとIV（初期化ベクトル）のサイズ
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * テキストを暗号化します
 * @param text 暗号化する平文
 */
export function encrypt(text: string): string {
  // 暗号化キーが32バイトであることを保証する（足りない場合はパディング、多い場合はカット）
  let key = Buffer.from(ENCRYPTION_KEY, 'utf-8');
  if (key.length !== 32) {
    const hash = crypto.createHash('sha256');
    hash.update(ENCRYPTION_KEY);
    key = hash.digest();
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // IVと暗号化されたテキストを ':' で結合して返す
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * 暗号化されたテキストを復号化します
 * @param encryptedText 暗号化されたテキスト (iv:ciphertext 形式)
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    let key = Buffer.from(ENCRYPTION_KEY, 'utf-8');
    if (key.length !== 32) {
      const hash = crypto.createHash('sha256');
      hash.update(ENCRYPTION_KEY);
      key = hash.digest();
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}
