const contextDao = require('../dao/context');
const usersDao = require('../dao/users');

function rememberVisited(request) {
    return agent => {
        const userAccount = contextDao.getUserId(request);
        return usersDao.getUserById(userAccount).then(user => {
            if(user) {
              const message = user.placesKnown && user.placesKnown.length?`Ya has visitado los siguientes lugares: ${user.placesKnown.join(', ')}`:'No has visitado aún a ningún sitio. ¡Acabas de empezar!'
              return agent.add(message);
            }
        });
    }
}

module.exports = { rememberVisited };