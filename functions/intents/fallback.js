const contextDao = require('../dao/context');
const countIntents = require('../utils/countIntents');


function fallback(request) {
  return agent => {
    const userId = contextDao.getUserId(request);

    countIntents.count(userId);
    agent.add('No te entiendo');
    agent.add('Lo siento, ¿Puedes repetirmelo?');
    
    return Promise.resolve({});
  };
}

module.exports = { fallback };
