const objectsDao = require('../../dao/objects');
const usersDao = require('../../dao/users');

function eat(agent, userAccount, user, objectName) {
  return objectsDao.getObjectByObjectId(user, objectName).then(object => {
    if(object.type == 'food') {
      return objectsDao.deleteObjectByUser(userAccount, user, object.name).then(() => {
        const newHungry = user.hungry + object.lifePoints;
        Object.assign( user, { hungry: newHungry });
        usersDao.updateUser(userAccount, user);
        agent.add(`Te comes ${object.name} sin masticar y sientes cómo has rejuvenecido un poco más`);
      });
    } else {
      agent.add('Eso no se puede comer');
    }
  }).catch(e => {
    agent.add('Aún no dispones de ese manjar');
  });
}

module.exports = { eat };