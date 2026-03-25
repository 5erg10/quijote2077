const usersDao = require('../repositories/user.repository');
const gameService = require('../services/game.service');

const processGameAction = async (req, res) => {
  const { text, id, userName } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Se requiere el campo id' });
  }

  try {
    const user = await usersDao.getUserById(id);
    const userExists = user && Object.keys(user).length > 0;
    if (!userExists && !!userName) return;
    return res.json(await gameService.handleGameplay(id, text, user));

  } catch (error) {
    console.error('game.controller error:', error);
    return res.status(500).json({
      messages: [{ text: 'Ha ocurrido un error inesperado en la aventura.', intent: 'error' }]
    });
  }
}

const launchInitGame = async (req, res) => {
   try {
    if (!req.query.userId) {
      res.status('400').send('User id must be provided');
    }
    const user = await usersDao.getUserById(req.query.userId);
    const userExists = user && Object.keys(user).length > 0;
    if (!userExists) {
      res.status('404').send('No user founded');
    };
    return res.json(await gameService.launchWelcome(user));

  } catch (error) {
    console.error('game.controller error:', error);
    return res.status(500).json({
      messages: [{ text: 'Ha ocurrido un error inesperado en la aventura.', intent: 'error' }]
    });
  }
}
  

module.exports = {
  processGameAction,
  launchInitGame
};
