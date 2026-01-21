const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // For simplicity in this demo, we check a custom header 'x-role' for quick testing
    // OR a real Bearer token. Let's support both for your ease of testing.
    const token = req.headers['authorization'];
    const bypassRole = req.headers['x-role']; // For quick testing without login

    if (bypassRole) {
        req.user = { role: bypassRole, id: 'test-user-id' };
        return next();
    }

    if (!token) return res.status(403).json({ error: "No token provided" });

    try {
        const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET || 'secret_key');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid Token" });
    }
};

const checkRole = (allowedRoles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    
    // Admin has access to everything
    if (req.user.role === 'Admin') return next();

    if (allowedRoles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: `Access Denied. Required: ${allowedRoles.join(' or ')}` });
    }
};

module.exports = { verifyToken, checkRole };