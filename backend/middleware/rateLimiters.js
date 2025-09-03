const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Túl sok próbálkozás, kérjük, próbáld újra 15 perc múlva.',
  },
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req);
    const emailKey = (req.body && req.body.email) ? String(req.body.email).toLowerCase() : '';
    return emailKey ? `${ipKey}:${emailKey}` : ipKey;
  },
});

module.exports = {
    authLimiter
};