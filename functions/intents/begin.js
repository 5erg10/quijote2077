const contextDao = require('../dao/context');
const usersDao = require('../dao/users');

function beginAdventure(request) {
  return agent => {
    const userName = agent.parameters.user;
    const userAccount = contextDao.getUserId(request);
    const coordinates = { lat: 39.5137458, lng: -3.0046506};
    const message = `Excelente nombre, ${userName}. ¿Qué nivel de dificultad deseas: *fácil*, *medio* o *difícil*.`;
    return usersDao.addUser(userAccount, userName, coordinates)
      .then(() => agent.add(message));
  };
}

module.exports = { beginAdventure };
