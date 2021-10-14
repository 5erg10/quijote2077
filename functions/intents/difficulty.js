const contextDao = require('../dao/context');
const usersDao = require('../dao/users');
const placesDao = require('../dao/places');
const { textByDifficulty } = require('../utils/difficultyUtils');

function difficulty(request) {
    return async agent => {
        const difficultyLevel = agent.parameters.difficultyLevel;
        const userId = contextDao.getUserId(request);
        const userData = await usersDao.getUserById(userId);
        const preMessage = `Excelente, comenzarás la aventura con dificultad *${difficultyLevel}*.\n`;

        let maxCapacity = 0;
        switch(difficultyLevel) {
          case 'facil': maxCapacity = 9999999;
            break;
          case 'media': maxCapacity = 100;
            break;
          case 'dificil': maxCapacity = 50;
            break;
        }

        let difficulty = { difficulty: { level: difficultyLevel, maxCapacity: maxCapacity }};

        await usersDao.updateUser(userId, Object.assign(userData, difficulty));
        // Comenzamos en la biblioteca
        return placesDao.getPlaceById('biblioteca').then(place => {
          if(place) {
            agent.add(`<img src="${place.media.images[0]}">`);
            return agent.add(`${preMessage}${textByDifficulty(place.description, difficulty)}`);
          }
        });
    }
}

module.exports = { difficulty };
