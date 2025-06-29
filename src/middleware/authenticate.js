const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    
    if (!token) {
        return res.status(405).send('Access Denied');
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(405).send('Invalid Token'); 

        req.user = user;

        next();
    });
};

module.exports = authenticateJWT;