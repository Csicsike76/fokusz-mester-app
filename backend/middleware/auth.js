const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Hiányzó authentikációs token.' });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Érvénytelen vagy lejárt token.' });
    req.user = user;
    next();
  });
};

const authenticateTokenOptional = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Hozzáférés megtagadva: adminisztrátori jogosultság szükséges.' });
  }
};

const authorizeTeacher = (req, res, next) => {
    if (req.user && req.user.role === 'teacher') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Hozzáférés megtagadva: tanári jogosultság szükséges.' });
    }
};

module.exports = {
    authenticateToken,
    authenticateTokenOptional,
    authorizeAdmin,
    authorizeTeacher
};