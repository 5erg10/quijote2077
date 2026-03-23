const { Router } = require('express');
const { gameLimiter } = require('../middleware/rateLimiter');
const gameController = require('../controllers/game.controller');

const router = Router();

router.post('/api/game', gameLimiter, gameController);

module.exports = router;
