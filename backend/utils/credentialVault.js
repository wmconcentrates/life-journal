// Credential Vault - Secure storage for integration tokens
import { encryptData, decryptData } from './encryption.js';
import { getMasterKey } from './keyManagement.js';

// In-memory store for development (replace with Supabase in production)
let credentialStore = new Map();

export const storeCredential = async (supabase, userId, integration, token, tokenType = 'access') => {
    const masterKey = getMasterKey();
    const encrypted = encryptData({ token, tokenType }, masterKey);

    const credentialData = {
        user_id: userId,
        integration: integration,
        encrypted_token: JSON.stringify(encrypted),
        token_type: tokenType,
        updated_at: new Date().toISOString(),
        last_used: null
    };

    // Try to update existing or insert new
    const { data: existing } = await supabase
        .from('user_credentials')
        .select('id')
        .eq('user_id', userId)
        .eq('integration', integration)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('user_credentials')
            .update(credentialData)
            .eq('id', existing.id);

        if (error) throw error;
    } else {
        credentialData.created_at = new Date().toISOString();
        const { error } = await supabase
            .from('user_credentials')
            .insert(credentialData);

        if (error) throw error;
    }

    return { success: true };
};

export const getCredential = async (supabase, userId, integration) => {
    const { data, error } = await supabase
        .from('user_credentials')
        .select('encrypted_token')
        .eq('user_id', userId)
        .eq('integration', integration)
        .single();

    if (error || !data) {
        return null;
    }

    const masterKey = getMasterKey();
    const encrypted = JSON.parse(data.encrypted_token);
    const decrypted = decryptData(encrypted, masterKey);

    // Update last_used
    await supabase
        .from('user_credentials')
        .update({ last_used: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('integration', integration);

    return decrypted.token;
};

export const deleteCredential = async (supabase, userId, integration) => {
    // Soft delete by adding deleted_at timestamp
    const { error } = await supabase
        .from('user_credentials')
        .update({
            deleted_at: new Date().toISOString(),
            encrypted_token: null
        })
        .eq('user_id', userId)
        .eq('integration', integration);

    if (error) throw error;
    return { success: true };
};

// In-memory versions for testing without Supabase
export const storeCredentialLocal = (userId, integration, token, tokenType = 'access') => {
    const masterKey = getMasterKey();
    const encrypted = encryptData({ token, tokenType }, masterKey);
    const key = `${userId}:${integration}`;
    credentialStore.set(key, {
        encrypted,
        tokenType,
        createdAt: new Date().toISOString()
    });
    return { success: true };
};

export const getCredentialLocal = (userId, integration) => {
    const key = `${userId}:${integration}`;
    const stored = credentialStore.get(key);
    if (!stored) return null;

    const masterKey = getMasterKey();
    const decrypted = decryptData(stored.encrypted, masterKey);
    return decrypted.token;
};

export const clearLocalStore = () => {
    credentialStore.clear();
};
