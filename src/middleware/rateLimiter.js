const rateLimit = require('express-rate-limit');

const gameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, espera un momento antes de continuar.' },
});

module.exports = { gameLimiter };
