const usersDao = require('../dao/users');
const difficultyUtils = require('../utils/difficultyUtils');

function count(userId) {
  if (!userId) return Promise.resolve();
  return usersDao.getUserById(userId).then(user => {
    if (user) {
      user.intents = (user.intents || 0) + 1;
      return usersDao.updateUser(userId, user);
    }
  });
}

async function checkIfNeedHelp(userId, user, intentName) {
  if (!user) return null;
  const intents = user.intents || 0;
  const difficultyLevel = user.difficulty && user.difficulty.level;

  if (difficultyLevel !== 'dificil' && intents > 4) {
    user.intents = 0;
    await usersDao.updateUser(userId, user);
    return difficultyUtils.getHelp(user, intentName);
  }
  return null;
}

module.exports = { count, checkIfNeedHelp };
