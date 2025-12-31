// Key management utility
// Validates and provides access to the encryption master key

const REQUIRED_KEY_LENGTH = 64; // 32 bytes = 64 hex characters

export const getMasterKey = () => {
    const key = process.env.ENCRYPTION_MASTER_KEY;

    if (!key) {
        throw new Error('ENCRYPTION_MASTER_KEY is not set in environment variables');
    }

    if (key.length !== REQUIRED_KEY_LENGTH) {
        throw new Error(
            `ENCRYPTION_MASTER_KEY must be ${REQUIRED_KEY_LENGTH} hex characters (32 bytes). ` +
            `Got ${key.length} characters.`
        );
    }

    // Validate it's a valid hex string
    if (!/^[0-9a-fA-F]+$/.test(key)) {
        throw new Error('ENCRYPTION_MASTER_KEY must be a valid hexadecimal string');
    }

    return key;
};

export const validateKeyOnStartup = () => {
    try {
        getMasterKey();
        console.log('✓ Encryption key validated');
        return true;
    } catch (error) {
        console.error('✗ Encryption key validation failed:', error.message);
        return false;
    }
};
