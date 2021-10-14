const objectsDao = require('../../dao/objects');

function take(agent, userAccount, user, objectName) {
  return objectsDao.addObject(userAccount, user, objectName)
    .then(() => agent.add(user.objectsList[objectName].successResponse))
    .catch(e => {
      agent.add(e);
    });
}

module.exports = { take };
