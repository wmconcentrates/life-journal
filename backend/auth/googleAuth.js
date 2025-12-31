// Google OAuth Authentication Service
import axios from 'axios';
import { generateToken, generateRefreshToken } from './jwtMiddleware.js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export const exchangeCodeForTokens = async (code, redirectUri) => {
    try {
        const response = await axios.post(GOOGLE_TOKEN_URL, {
            code,
            client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
            client_secret: process.env.GOOGLE_OAUTH_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in,
            idToken: response.data.id_token
        };
    } catch (error) {
        console.error('Google token exchange error:', error.response?.data || error.message);
        throw new Error('Failed to exchange code for tokens');
    }
};

export const getGoogleUserInfo = async (accessToken) => {
    try {
        const response = await axios.get(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        return {
            googleId: response.data.id,
            email: response.data.email,
            name: response.data.name,
            picture: response.data.picture
        };
    } catch (error) {
        console.error('Google userinfo error:', error.response?.data || error.message);
        throw new Error('Failed to get user info from Google');
    }
};

export const handleGoogleAuth = async (supabase, code, redirectUri) => {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get user info from Google
    const userInfo = await getGoogleUserInfo(tokens.accessToken);

    // Check if user exists in our database
    let { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', userInfo.email)
        .single();

    let userId;

    if (existingUser) {
        userId = existingUser.id;
        // Update last login
        await supabase
            .from('users')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', userId);
    } else {
        // Create new user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                email: userInfo.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (error) throw error;
        userId = newUser.id;
    }

    // Generate our own JWT tokens
    const jwtToken = generateToken(userId, userInfo.email);
    const refreshToken = generateRefreshToken(userId);

    return {
        success: true,
        token: jwtToken,
        refreshToken,
        user: {
            id: userId,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
        },
        googleTokens: tokens // Store these for API access
    };
};

// For testing without real Google OAuth
export const handleMockAuth = async (supabase, email = 'test@example.com') => {
    // Check if user exists
    let { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

    let userId;

    if (existingUser) {
        userId = existingUser.id;
    } else {
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                email: email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (error) throw error;
        userId = newUser.id;
    }

    const jwtToken = generateToken(userId, email);
    const refreshToken = generateRefreshToken(userId);

    return {
        success: true,
        token: jwtToken,
        refreshToken,
        user: {
            id: userId,
            email: email,
            name: 'Test User',
            picture: null
        }
    };
};

export const getGoogleOAuthUrl = (redirectUri) => {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/user.birthday.read',
            'https://www.googleapis.com/auth/user.addresses.read'
        ].join(' '),
        access_type: 'offline',
        prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};
