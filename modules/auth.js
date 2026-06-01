const jwt = require('jsonwebtoken');
const JWT_SECRET = "rdcrf_Secretkey";

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
	if (!localStorage.getItem('rftoken')) {
        window.location.href = '/login.html';
    }

    /*if (!token) {
        return res.redirect('/auth/login');
    }*/

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie('token');
        return res.redirect('/auth/login');
    }
};

module.exports = { verifyToken };