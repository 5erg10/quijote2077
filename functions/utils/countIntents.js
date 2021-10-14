const usersDao = require('../dao/users');
const contextDao = require('../dao/context');
const difficultyUtils = require('../utils/difficultyUtils');

function count(userId) {  
  if (userId) {
    return usersDao.getUserById(userId).then(user => {
      if (user) {
        const intents = (user.intents || 0) + 1;
    
        user.intents = intents;
        usersDao.updateUser(userId, user);
      }
    });
  }
  return Promise.resolve();
}

async function checkIfNeedHelp(request, agent, intentName) {
  const userAccount = contextDao.getUserId(request);
  const user = await usersDao.getUserById(userAccount)

  if (user) {
    const intents = user.intents;
    const difficultyLevel = user.difficulty && user.difficulty.level;

    if (difficultyLevel !== 'dificil' && intents > 4) {
      user.intents = 0;
      agent.add(difficultyUtils.getHelp(user, intentName));
      usersDao.updateUser(userAccount, user);
    }
  }

}

module.exports = { count, checkIfNeedHelp };
