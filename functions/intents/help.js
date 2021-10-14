const contextDao = require('../dao/context');
const usersDao = require('../dao/users');
const difficultyUtils = require('../utils/difficultyUtils');

const jokes = [
  '¿Estás cansado de ser un hidalgo? No haber empezado.',
  'El que mal empieza, mal acaba.',
  '¿Eres tan inútil que tienes que pedir ayuda?'
];

function execute(request) {
  return agent => {
    const userAccount = contextDao.getUserId(request);
    return usersDao.getUserById(userAccount).then(user => {
      const difficultyLevel = user.difficulty.level;
      if (!difficultyLevel) {
        throw new Error('Dificulty not found');
      }

      if (difficultyLevel === 'facil') {
        agent.add(difficultyUtils.getHelp(user));
      } else if (difficultyLevel === 'media') {
        agent.add('Inténtalo de nuevo, y si no te llega la inspiración, se te ayudará.');
      } else {
        const random =  Math.floor(Math.random()*(jokes.length));

        agent.add(jokes[random]);
      }
    });
  };
}

module.exports = { execute };
