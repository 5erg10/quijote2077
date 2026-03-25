const { Router } = require('express');
const { getUserData, handlePlaces, saveUserData } = require('../controllers/user.controller');

const router = Router();

router.get('/user', getUserData);
router.post('/user', saveUserData)
router.get('/places', handlePlaces);

module.exports = router;
