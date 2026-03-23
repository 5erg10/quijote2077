const usersDao = require('../repositories/user.repository');
const gameService = require('../services/game.service');

module.exports = async (req, res) => {
  const { text, id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Se requiere el campo id' });
  }

  try {
    const user = await usersDao.getUserById(id);
    const userExists = user && Object.keys(user).length > 0;
    const hasName = userExists && user.userName;
    const hasDifficulty = hasName && user.difficulty;

    if (!userExists || !hasName) {
      return res.json(await gameService.handleWelcome(id, text, userExists ? user : null));
    }

    if (!hasDifficulty) {
      return res.json(await gameService.handleDifficulty(id, text, user));
    }

    return res.json(await gameService.handleGameplay(id, text, user));

  } catch (error) {
    console.error('game.controller error:', error);
    return res.status(500).json({
      messages: [{ text: 'Ha ocurrido un error inesperado en la aventura.', intent: 'error' }]
    });
  }
};
