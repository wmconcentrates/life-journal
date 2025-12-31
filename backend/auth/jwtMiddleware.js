// JWT Authentication Middleware
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access token required',
            code: 'NO_TOKEN'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token has expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
};

export const generateToken = (userId, email) => {
    return jwt.sign(
        { userId, email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

export const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};
