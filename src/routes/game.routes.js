const { Router } = require('express');
const { gameLimiter } = require('../middleware/rateLimiter');
const { processGameAction, launchInitGame } = require('../controllers/game.controller');

const router = Router();

router.post('/api/game', gameLimiter, processGameAction);
router.get('/api/initGame', gameLimiter, launchInitGame);

module.exports = router;
