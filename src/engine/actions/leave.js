const objectsDao = require('../../repositories/object.repository');
const countIntents = require('../../utils/countIntents');

async function execute(intent, userId, user) {
  const objectName = intent.object;
  const placeName = user.currentRoom.id;

  if (!objectName) {
    return { action: 'tirar', success: false, message: '\u00bfQué quieres tirar?' };
  }

  const hasObject = (user.objects || []).some(o => o.name === objectName);
  
  if (!hasObject) {
    await countIntents.count(userId);
    return { action: 'tirar', success: false, message: `No llevas ningún ${objectName} encima.` };
  }

  // Actualizar currentPlace del objeto al lugar actual
  if (user.objectsList[objectName]) {
    user.objectsList[objectName].currentPlace = placeName;
    user.objectsList[objectName].jointToSuccess = false;
  }

  await objectsDao.deleteObjectByUser(userId, user, objectName);

  return {
    action: 'tirar',
    success: true,
    object: objectName,
    place: placeName,
    message: `Has dejado el ${objectName} en el suelo.`
  };
}

module.exports = { execute };
