const usersDao = require('../../repositories/user.repository');
const objectsDao = require('../../repositories/object.repository');
const gameOperations = require('../gameOperations');
const countIntents = require('../../utils/countIntents');

async function execute(intent, userId, user) {
  const objectName = intent.object;

  if (!objectName) {
    return { action: 'comer', success: false, message: '\u00bfQué quieres comer?' };
  }

  const hasObject = (user.objects || []).some(o => o.name === objectName);
  if (!hasObject) {
    await countIntents.count(userId);
    return { action: 'comer', success: false, message: `No llevas ningún ${objectName} en el inventario.` };
  }

  const objectData = user.objectsList[objectName];
  if (!objectData || objectData.type !== 'food') {
    await countIntents.count(userId);
    return { action: 'comer', success: false, message: `El ${objectName} no es comestible, valiente hidalgo.` };
  }

  const lifePoints = objectData.lifePoints || 0;
  const newHungry = Math.min(100, user.hungry + lifePoints);

  if (lifePoints < 0) {
    // Objeto tóxico (amanita)
    return gameOperations.buildResetResult(
      `Comerse una ${objectName} ha resultado ser una pésima idea. Te retuerces de dolor y cierras los ojos para siempre.`,
      'death'
    );
  }

  await objectsDao.deleteObjectByUser(userId, user, objectName);
  await usersDao.updateUser(userId, { ...user, hungry: newHungry, intents: 0 });

  return {
    action: 'comer',
    success: true,
    object: objectName,
    lifePoints,
    newHungry,
    message: `Te comes el ${objectName}. +${lifePoints} de energía.`
  };
}

module.exports = { execute };
