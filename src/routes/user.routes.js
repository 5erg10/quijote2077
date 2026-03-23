const { Router } = require('express');
const { handleUserState, handlePlaces } = require('../controllers/user.controller');

const router = Router();

router.get('/userstate', handleUserState);
router.get('/places', handlePlaces);

module.exports = router;
