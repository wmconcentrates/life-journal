import crypto from 'crypto';
export const encryptData = (data, masterKey) => {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(masterKey, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
};
export const decryptData = (encrypted, masterKey) => {
    const key = Buffer.from(masterKey, 'hex');
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(encrypted.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
};
